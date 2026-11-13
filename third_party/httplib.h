#pragma once
// Lightweight cross-platform HTTP server (Linux/POSIX + Windows)
// Implements the same httplib::Server API surface used by Chronos.
// On Linux: uses POSIX sockets. On Windows: uses Winsock2.

#ifdef _WIN32
#  ifndef WIN32_LEAN_AND_MEAN
#    define WIN32_LEAN_AND_MEAN
#  endif
#  include <winsock2.h>
#  include <ws2tcpip.h>
   typedef SOCKET sock_t;
#  define INVALID_SOCK INVALID_SOCKET
#  define close_sock(s) closesocket(s)
#  define sock_errno WSAGetLastError()
#else
#  include <sys/socket.h>
#  include <netinet/in.h>
#  include <arpa/inet.h>
#  include <unistd.h>
#  include <cerrno>
   typedef int sock_t;
#  define INVALID_SOCK (-1)
#  define close_sock(s) ::close(s)
#  define sock_errno errno
#endif

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
            // case-insensitive compare
            if (k.size() == key.size()) {
                bool eq = true;
                for (size_t i = 0; i < k.size(); ++i)
                    if (std::tolower((unsigned char)k[i]) != std::tolower((unsigned char)key[i]))
                        { eq = false; break; }
                if (eq) return v;
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
#ifdef _WIN32
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
#endif
    }

    ~Server() {
        stop();
#ifdef _WIN32
        WSACleanup();
#endif
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
        mount_dir_   = dir;
        return *this;
    }

    bool listen(const std::string& host, int port) {
        listen_sock_ = ::socket(AF_INET, SOCK_STREAM, 0);
        if (listen_sock_ == INVALID_SOCK) return false;

        int opt = 1;
#ifdef _WIN32
        setsockopt(listen_sock_, SOL_SOCKET, SO_REUSEADDR,
                   reinterpret_cast<const char*>(&opt), sizeof(opt));
#else
        setsockopt(listen_sock_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_port   = htons(static_cast<uint16_t>(port));
        inet_pton(AF_INET, host.c_str(), &addr.sin_addr);

        if (::bind(listen_sock_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
            close_sock(listen_sock_); listen_sock_ = INVALID_SOCK; return false;
        }
        if (::listen(listen_sock_, SOMAXCONN) != 0) {
            close_sock(listen_sock_); listen_sock_ = INVALID_SOCK; return false;
        }

        is_running_ = true;
        std::cout << "[Chronos Server] Listening on http://" << host << ":" << port << "\n";

        while (is_running_) {
            sockaddr_in client_addr{};
            socklen_t client_len = sizeof(client_addr);
            sock_t client = ::accept(listen_sock_,
                                     reinterpret_cast<sockaddr*>(&client_addr),
                                     &client_len);
            if (client == INVALID_SOCK) {
                if (!is_running_) break;
                continue;
            }
            std::thread([this, client]() { handle_client(client); }).detach();
        }
        return true;
    }

    void stop() {
        if (is_running_) {
            is_running_ = false;
            if (listen_sock_ != INVALID_SOCK) {
                close_sock(listen_sock_);
                listen_sock_ = INVALID_SOCK;
            }
        }
    }

private:
    sock_t listen_sock_ = INVALID_SOCK;
    std::atomic<bool> is_running_{false};
    std::map<std::string, Handler> get_handlers_;
    std::map<std::string, Handler> post_handlers_;
    std::string mount_point_;
    std::string mount_dir_;

    static std::string mime_type(const std::string& path) {
        auto ends = [&](const char* s) {
            return path.size() >= strlen(s) &&
                   path.compare(path.size() - strlen(s), strlen(s), s) == 0;
        };
        if (ends(".html") || ends(".htm")) return "text/html; charset=utf-8";
        if (ends(".css"))  return "text/css; charset=utf-8";
        if (ends(".js"))   return "application/javascript; charset=utf-8";
        if (ends(".json")) return "application/json; charset=utf-8";
        if (ends(".svg"))  return "image/svg+xml";
        if (ends(".png"))  return "image/png";
        if (ends(".ico"))  return "image/x-icon";
        return "text/plain; charset=utf-8";
    }

    // Raw socket read/write helpers
    static bool sock_send(sock_t s, const std::string& data) {
        size_t sent = 0;
        while (sent < data.size()) {
#ifdef _WIN32
            int n = ::send(s, data.data() + sent, (int)(data.size() - sent), 0);
#else
            ssize_t n = ::send(s, data.data() + sent, data.size() - sent, MSG_NOSIGNAL);
#endif
            if (n <= 0) return false;
            sent += n;
        }
        return true;
    }

    void handle_client(sock_t client) {
        // Read until we see the end of the HTTP headers
        std::string raw;
        char buf[4096];
        while (raw.find("\r\n\r\n") == std::string::npos) {
#ifdef _WIN32
            int n = ::recv(client, buf, sizeof(buf) - 1, 0);
#else
            ssize_t n = ::recv(client, buf, sizeof(buf) - 1, 0);
#endif
            if (n <= 0) { close_sock(client); return; }
            raw.append(buf, n);
        }

        size_t header_end = raw.find("\r\n\r\n");
        std::string header_part = raw.substr(0, header_end);
        std::string body_part   = (header_end + 4 < raw.size())
                                  ? raw.substr(header_end + 4) : "";

        // Parse request line
        std::istringstream hs(header_part);
        std::string req_line;
        std::getline(hs, req_line);
        if (!req_line.empty() && req_line.back() == '\r') req_line.pop_back();

        Request req;
        {
            std::istringstream rs(req_line);
            std::string ver;
            rs >> req.method >> req.path >> ver;
        }

        // Strip query string
        size_t qpos = req.path.find('?');
        std::string clean_path = (qpos != std::string::npos) ? req.path.substr(0, qpos) : req.path;

        // Parse headers
        std::string hline;
        while (std::getline(hs, hline)) {
            if (!hline.empty() && hline.back() == '\r') hline.pop_back();
            size_t colon = hline.find(':');
            if (colon != std::string::npos) {
                std::string k = hline.substr(0, colon);
                std::string v = hline.substr(colon + 1);
                size_t s = v.find_first_not_of(" \t");
                if (s != std::string::npos) v = v.substr(s);
                req.headers[k] = v;
            }
        }

        // Read body by Content-Length
        std::string clen_str = req.get_header_value("Content-Length");
        if (!clen_str.empty()) {
            size_t clen = std::stoul(clen_str);
            while (body_part.size() < clen) {
#ifdef _WIN32
                int n = ::recv(client, buf, sizeof(buf) - 1, 0);
#else
                ssize_t n = ::recv(client, buf, sizeof(buf) - 1, 0);
#endif
                if (n <= 0) break;
                body_part.append(buf, n);
            }
        }
        req.body = body_part;

        // Build response with CORS headers
        Response res;
        res.set_header("Access-Control-Allow-Origin",  "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");

        if (req.method == "OPTIONS") {
            res.status = 204;
        } else {
            bool handled = false;
            if (req.method == "GET" && get_handlers_.count(clean_path)) {
                get_handlers_[clean_path](req, res); handled = true;
            } else if (req.method == "POST" && post_handlers_.count(clean_path)) {
                post_handlers_[clean_path](req, res); handled = true;
            } else if (req.method == "GET" && !mount_dir_.empty()) {
                std::string rel = clean_path;
                if (rel == "/" || rel.empty()) rel = "/index.html";
                std::filesystem::path fp =
                    std::filesystem::path(mount_dir_) / rel.substr(1);
                if (std::filesystem::exists(fp) && !std::filesystem::is_directory(fp)) {
                    std::ifstream f(fp, std::ios::binary);
                    if (f) {
                        std::ostringstream ss; ss << f.rdbuf();
                        res.status = 200;
                        res.set_content(ss.str(), mime_type(fp.string()));
                        handled = true;
                    }
                }
            }
            if (!handled) {
                res.status = 404;
                res.set_content("{\"error\":\"Not Found\"}", "application/json");
            }
        }

        // Serialise and send HTTP response
        std::string status_text =
            res.status == 200 ? "OK" :
            res.status == 204 ? "No Content" :
            res.status == 400 ? "Bad Request" :
            res.status == 404 ? "Not Found" : "Internal Server Error";

        std::ostringstream out;
        out << "HTTP/1.1 " << res.status << " " << status_text << "\r\n";
        for (const auto& [k, v] : res.headers) out << k << ": " << v << "\r\n";
        out << "Content-Length: " << res.body.size() << "\r\n";
        out << "Connection: close\r\n\r\n";
        out << res.body;

        sock_send(client, out.str());
        close_sock(client);
    }
};

} // namespace httplib
