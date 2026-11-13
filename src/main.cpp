#include "GdbBackend.h"
#include "JsonExporter.h"
#include "Recorder.h"
#include "Timeline.h"
#include "httplib.h"

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string>
#include <vector>

namespace {

std::string g_currentRecordingJson;
std::mutex  g_recordingMutex;

std::vector<std::string> splitLines(const std::string& s) {
    std::vector<std::string> out;
    std::istringstream in(s);
    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        out.push_back(line);
    }
    return out;
}

// Minimal JSON string extractor (handles \n \r \t \\ \")
std::string extractJsonString(const std::string& json, const std::string& key) {
    size_t pos = json.find("\"" + key + "\"");
    if (pos == std::string::npos) return "";
    size_t colon = json.find(':', pos);
    if (colon == std::string::npos) return "";
    size_t startQ = json.find('"', colon);
    if (startQ == std::string::npos) return "";
    std::string val;
    bool esc = false;
    for (size_t i = startQ + 1; i < json.size(); ++i) {
        char c = json[i];
        if (esc) {
            switch (c) {
                case 'n':  val += '\n'; break;
                case 'r':  val += '\r'; break;
                case 't':  val += '\t'; break;
                case '\\': val += '\\'; break;
                case '"':  val += '"';  break;
                default:   val += c;    break;
            }
            esc = false;
        } else if (c == '\\') {
            esc = true;
        } else if (c == '"') {
            break;
        } else {
            val += c;
        }
    }
    return val;
}

std::string escapeJsonString(const std::string& s) {
    std::string r = "\"";
    for (unsigned char c : s) {
        switch (c) {
            case '"':  r += "\\\""; break;
            case '\\': r += "\\\\"; break;
            case '\n': r += "\\n";  break;
            case '\r': r += "\\r";  break;
            case '\t': r += "\\t";  break;
            default:
                if (c < 0x20) {
                    char b[8]; snprintf(b, sizeof b, "\\u%04x", c);
                    r += b;
                } else {
                    r += (char)c;
                }
        }
    }
    return r + "\"";
}

// Compile sourceCode, run it through GDB, return JSON recording.
// Returns true on success. On failure sets outCompileError.
bool runCompileAndRecord(const std::string& sourceCode,
                         const std::string& filename,
                         std::string& outRecordingJson,
                         std::string& outCompileError) {

    // Use /tmp so we don't clutter the working directory and avoid
    // permission issues that can arise in Codespaces.
    std::string srcFile = "/tmp/_chronos_temp.cpp";
    std::string exeFile = "/tmp/_chronos_temp";      // no .exe on Linux
    std::string errFile = "/tmp/_chronos_compile.log";

    // Write source
    {
        std::ofstream out(srcFile, std::ios::binary);
        if (!out) {
            outCompileError = "Failed to create temporary source file: " + srcFile;
            return false;
        }
        out.write(sourceCode.data(), (std::streamsize)sourceCode.size());
    }

    // Compile with debug info; redirect stderr to errFile
    std::string cmd = "g++ -g -O0 -std=c++17 \"" + srcFile + "\" -o \"" +
                      exeFile + "\" > \"" + errFile + "\" 2>&1";
    int rc = std::system(cmd.c_str());

    if (rc != 0) {
        std::ifstream ef(errFile);
        std::ostringstream ss; ss << ef.rdbuf();
        outCompileError = ss.str();
        if (outCompileError.empty())
            outCompileError = "Compilation failed (exit code " + std::to_string(rc) + ")";
        std::filesystem::remove(srcFile);
        std::filesystem::remove(errFile);
        return false;
    }

    // Make sure the binary is executable (should already be, but be explicit)
    std::filesystem::permissions(exeFile,
        std::filesystem::perms::owner_exec |
        std::filesystem::perms::group_exec |
        std::filesystem::perms::others_exec,
        std::filesystem::perm_options::add);

    // Record execution through GDB
    GdbBackend gdb;
    Recorder   recorder(gdb);
    Timeline   tl;
    bool ok = recorder.record(exeFile, tl, 500);

    // Clean up temp files
    std::filesystem::remove(srcFile);
    std::filesystem::remove(exeFile);
    std::filesystem::remove(errFile);

    if (!ok && tl.empty()) {
        outCompileError = "Recording failed: GDB could not execute the program. "
                          "Make sure gdb is installed (apt install gdb).";
        return false;
    }

    std::vector<std::string> lines = splitLines(sourceCode);
    outRecordingJson = JsonExporter::toJson(
        tl, filename.empty() ? "main.cpp" : filename, lines);
    return true;
}

} // namespace

int main(int argc, char** argv) {
    int port = 8080;
    std::string inputFile;
    bool consoleOnly = false;
    bool dumpJson    = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--no-server") {
            consoleOnly = true;
        } else if (arg == "--dump-json") {
            dumpJson    = true;
            consoleOnly = true;
        } else if (arg == "--server" || arg == "-s") {
            if (i + 1 < argc) port = std::stoi(argv[++i]);
        } else if (arg.rfind(".cpp") != std::string::npos ||
                   std::filesystem::exists(arg)) {
            inputFile = arg;
        } else {
            try { port = std::stoi(arg); } catch (...) {}
        }
    }

    // If a file was provided, compile and record it first
    if (!inputFile.empty()) {
        std::string abs = std::filesystem::absolute(inputFile).string();
        std::ifstream in(abs);
        if (!in) {
            std::cerr << "Could not open: " << abs << "\n";
            return 1;
        }
        std::ostringstream ss; ss << in.rdbuf();
        std::string code = ss.str();
        std::string recJson, err;
        std::string fname = std::filesystem::path(abs).filename().string();
        std::cout << "[Chronos] Compiling " << fname << " ...\n";

        if (!runCompileAndRecord(code, fname, recJson, err)) {
            std::cerr << "[Chronos] Failed:\n" << err << "\n";
            if (consoleOnly) return 1;
        } else {
            std::lock_guard<std::mutex> lock(g_recordingMutex);
            g_currentRecordingJson = recJson;
            std::cout << "[Chronos] Recorded " << recJson.size() << " bytes.\n";
        }

        if (consoleOnly) {
            if (dumpJson) std::cout << recJson << "\n";
            return 0;
        }
    } else {
        // Pre-load the factorial example if available
        const char* seeds[] = {
            "examples/fact.cpp", "../examples/fact.cpp", nullptr
        };
        for (int k = 0; seeds[k]; ++k) {
            if (!std::filesystem::exists(seeds[k])) continue;
            std::ifstream in(seeds[k]);
            std::ostringstream ss; ss << in.rdbuf();
            std::string recJson, err;
            if (runCompileAndRecord(ss.str(), "fact.cpp", recJson, err)) {
                std::lock_guard<std::mutex> lock(g_recordingMutex);
                g_currentRecordingJson = recJson;
                std::cout << "[Chronos] Pre-loaded example: fact.cpp\n";
            }
            break;
        }
    }

    // ── HTTP Server ──────────────────────────────────────────────────────────
    httplib::Server svr;

    // Locate the frontend directory regardless of where chronos is invoked from
    std::string frontendDir = "frontend";
    for (const char* p : { "frontend", "../frontend" }) {
        if (std::filesystem::exists(p)) { frontendDir = p; break; }
    }
    svr.set_mount_point("/", frontendDir);

    // GET /api/status — health-check used by the frontend
    svr.Get("/api/status", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
        res.set_content(
            "{\"status\":\"ok\",\"service\":\"chronos\",\"gdb\":true}",
            "application/json");
    });

    // GET /api/recording — return the most recent recording
    svr.Get("/api/recording", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_recordingMutex);
        if (g_currentRecordingJson.empty()) {
            res.status = 404;
            res.set_content(
                "{\"error\":\"No recording available. "
                "Run a C++ program in the Code Editor.\"}",
                "application/json");
        } else {
            res.status = 200;
            res.set_content(g_currentRecordingJson, "application/json; charset=utf-8");
        }
    });

    // POST /api/run — compile and record source submitted by the editor
    svr.Post("/api/run", [](const httplib::Request& req, httplib::Response& res) {
        std::string source = extractJsonString(req.body, "source");
        std::string file   = extractJsonString(req.body, "file");
        if (file.empty()) file = "main.cpp";

        if (source.empty()) {
            res.status = 400;
            res.set_content(
                "{\"success\":false,\"compileError\":\"Source code cannot be empty.\"}",
                "application/json");
            return;
        }

        std::cout << "[Chronos] /api/run  file=" << file
                  << "  size=" << source.size() << " bytes\n";

        std::string recJson, err;
        bool ok = runCompileAndRecord(source, file, recJson, err);

        if (!ok) {
            std::cout << "[Chronos] Compile/run error:\n" << err << "\n";
            res.status = 200;   // 200 so the client receives our JSON error body
            res.set_content(
                "{\"success\":false,\"compileError\":" + escapeJsonString(err) + "}",
                "application/json; charset=utf-8");
        } else {
            {
                std::lock_guard<std::mutex> lock(g_recordingMutex);
                g_currentRecordingJson = recJson;
            }
            std::cout << "[Chronos] Execution recorded.\n";
            res.status = 200;
            res.set_content(
                "{\"success\":true,\"recording\":" + recJson + "}",
                "application/json; charset=utf-8");
        }
    });

    std::cout << "========================================================\n"
              << "  Chronos — Time-Travel Debugger\n"
              << "  Open: http://localhost:" << port << "\n"
              << "========================================================\n";

    svr.listen("0.0.0.0", port);
    return 0;
}
