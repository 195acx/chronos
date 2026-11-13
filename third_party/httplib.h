#pragma once

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>

#include <atomic>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

namespace httplib {

struct Request {
    std::string method;
    std::string path;
    std::string body;
    std::map<std::string, std::string> headers;

    std::string get_header_value(const std::string& key) const {
        for (const auto& [k, v] : headers) {
            if (_stricmp(k.c_str(), key.c_str()) == 0) {
                return v;
            }
        }
        return "";
    }
};

struct Response {
    int status = 200;
    std::string body;
    std::map<std::string, std::string> headers;

    void set_content(const std::string& s, const std::string& content_type) {
        body = s;
        headers["Content-Type"] = content_type;
    }

    void set_header(const std::string& key, const std::string& val) {
        headers[key] = val;
    }
};

class Server {
public:
    using Handler = std::function<void(const Request&, Response&)>;

    Server() {
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
    }

    ~Server() {
        stop();
        WSACleanup();
    }

    Server& Get(const std::string& pattern, Handler handler) {
        get_handlers_[pattern] = handler;
        return *this;
    }

    Server& Post(const std::string& pattern, Handler handler) {
        post_handlers_[pattern] = handler;
        return *this;
    }

    Server& set_mount_point(const std::string& mount_point, const std::string& dir) {
        mount_point_ = mount_point;
        mount_dir_ = dir;
        return *this;
    }

    bool listen(const std::string& host, int port) {
        listen_socket_ = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (listen_socket_ == INVALID_SOCKET) {
            return false;
        }

        int opt = 1;
        setsockopt(listen_socket_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

        sockaddr_in server_addr{};
        server_addr.sin_family = AF_INET;
        server_addr.sin_port = htons(static_cast<u_short>(port));
        inet_pton(AF_INET, host.c_str(), &server_addr.sin_addr);

        if (bind(listen_socket_, reinterpret_cast<sockaddr*>(&server_addr), sizeof(server_addr)) == SOCKET_ERROR) {
            closesocket(listen_socket_);
            listen_socket_ = INVALID_SOCKET;
            return false;
        }

        if (::listen(listen_socket_, SOMAXCONN) == SOCKET_ERROR) {
            closesocket(listen_socket_);
            listen_socket_ = INVALID_SOCKET;
            return false;
        }

        is_running_ = true;
        std::cout << "[Chronos Server] Listening on http://" << host << ":" << port << "\n";

        while (is_running_) {
            sockaddr_in client_addr{};
            int client_len = sizeof(client_addr);
            SOCKET client_socket = accept(listen_socket_, reinterpret_cast<sockaddr*>(&client_addr), &client_len);

            if (client_socket == INVALID_SOCKET) {
                if (!is_running_) break;
                continue;
            }

            std::thread([this, client_socket]() {
                handle_client(client_socket);
            }).detach();
        }

        return true;
    }

    void stop() {
        if (is_running_) {
            is_running_ = false;
            if (listen_socket_ != INVALID_SOCKET) {
                closesocket(listen_socket_);
                listen_socket_ = INVALID_SOCKET;
            }
        }
    }

private:
    SOCKET listen_socket_ = INVALID_SOCKET;
    std::atomic<bool> is_running_{false};
    std::map<std::string, Handler> get_handlers_;
    std::map<std::string, Handler> post_handlers_;
    std::string mount_point_;
    std::string mount_dir_;

    static std::string get_mime_type(const std::string& path) {
        if (path.rfind(".html") != std::string::npos || path.rfind(".htm") != std::string::npos) return "text/html; charset=utf-8";
        if (path.rfind(".css") != std::string::npos) return "text/css; charset=utf-8";
        if (path.rfind(".js") != std::string::npos) return "application/javascript; charset=utf-8";
        if (path.rfind(".json") != std::string::npos) return "application/json; charset=utf-8";
        if (path.rfind(".svg") != std::string::npos) return "image/svg+xml";
        if (path.rfind(".png") != std::string::npos) return "image/png";
        if (path.rfind(".ico") != std::string::npos) return "image/x-icon";
        return "text/plain; charset=utf-8";
    }

    void handle_client(SOCKET client_socket) {
        std::string raw_request;
        char buffer[4096];
        int bytes_read = 0;

        // Read headers
        while ((bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0)) > 0) {
            buffer[bytes_read] = '\0';
            raw_request.append(buffer, bytes_read);
            if (raw_request.find("\r\n\r\n") != std::string::npos) {
                break;
            }
        }

        if (raw_request.empty()) {
            closesocket(client_socket);
            return;
        }

        // Parse Request Line and Headers
        size_t header_end = raw_request.find("\r\n\r\n");
        std::string header_part = raw_request.substr(0, header_end);
        std::string body_part = (header_end != std::string::npos && header_end + 4 < raw_request.size())
                                    ? raw_request.substr(header_end + 4)
                                    : "";

        std::istringstream stream(header_part);
        std::string request_line;
        std::getline(stream, request_line);
        if (!request_line.empty() && request_line.back() == '\r') {
            request_line.pop_back();
        }

        std::istringstream req_stream(request_line);
        Request req;
        std::string http_version;
        req_stream >> req.method >> req.path >> http_version;

        // Strip query string for path routing
        size_t qpos = req.path.find('?');
        std::string clean_path = (qpos != std::string::npos) ? req.path.substr(0, qpos) : req.path;

        // Parse Headers
        std::string line;
        while (std::getline(stream, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            size_t colon = line.find(':');
            if (colon != std::string::npos) {
                std::string k = line.substr(0, colon);
                std::string v = line.substr(colon + 1);
                // trim
                size_t start = v.find_first_not_of(" \t");
                if (start != std::string::npos) v = v.substr(start);
                req.headers[k] = v;
            }
        }

        // Read remaining body if Content-Length specified
        std::string len_str = req.get_header_value("Content-Length");
        if (!len_str.empty()) {
            size_t content_length = std::stoul(len_str);
            while (body_part.size() < content_length) {
                bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
                if (bytes_read <= 0) break;
                buffer[bytes_read] = '\0';
                body_part.append(buffer, bytes_read);
            }
        }
        req.body = body_part;

        Response res;
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");

        // Handle OPTIONS preflight
        if (req.method == "OPTIONS") {
            res.status = 204;
            send_response(client_socket, res);
            closesocket(client_socket);
            return;
        }

        // Route Request
        bool handled = false;
        if (req.method == "GET" && get_handlers_.find(clean_path) != get_handlers_.end()) {
            get_handlers_[clean_path](req, res);
            handled = true;
        } else if (req.method == "POST" && post_handlers_.find(clean_path) != post_handlers_.end()) {
            post_handlers_[clean_path](req, res);
            handled = true;
        } else if (req.method == "GET" && !mount_dir_.empty()) {
            // Serve static files
            std::string relative_path = clean_path;
            if (relative_path == "/" || relative_path.empty()) {
                relative_path = "/index.html";
            }

            std::filesystem::path file_path = std::filesystem::path(mount_dir_) / relative_path.substr(1);
            if (std::filesystem::exists(file_path) && !std::filesystem::is_directory(file_path)) {
                std::ifstream f(file_path, std::ios::binary);
                if (f.is_open()) {
                    std::ostringstream ss;
                    ss << f.rdbuf();
                    res.status = 200;
                    res.set_content(ss.str(), get_mime_type(file_path.string()));
                    handled = true;
                }
            }
        }

        if (!handled) {
            res.status = 404;
            res.set_content("{\"error\":\"Not Found\"}", "application/json");
        }

        send_response(client_socket, res);
        closesocket(client_socket);
    }

    void send_response(SOCKET client_socket, const Response& res) {
        std::ostringstream out;
        std::string status_text = (res.status == 200) ? "OK" :
                                  (res.status == 204) ? "No Content" :
                                  (res.status == 400) ? "Bad Request" :
                                  (res.status == 404) ? "Not Found" : "Internal Server Error";

        out << "HTTP/1.1 " << res.status << " " << status_text << "\r\n";
        for (const auto& [k, v] : res.headers) {
            out << k << ": " << v << "\r\n";
        }
        out << "Content-Length: " << res.body.size() << "\r\n";
        out << "Connection: close\r\n";
        out << "\r\n";
        out << res.body;

        std::string response_str = out.str();
        send(client_socket, response_str.data(), static_cast<int>(response_str.size()), 0);
    }
};

} // namespace httplib
