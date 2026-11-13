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
#include <regex>
#include <sstream>
#include <string>
#include <vector>

namespace {

std::string g_currentRecordingJson;
std::mutex g_recordingMutex;

std::vector<std::string> splitLines(const std::string& s) {
    std::vector<std::string> out;
    std::istringstream in(s);
    std::string line;
    while (std::getline(in, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        out.push_back(line);
    }
    return out;
}

// Extract string value from a simple JSON object: {"key": "value"}
std::string extractJsonString(const std::string& json, const std::string& key) {
    std::string pattern = "\"" + key + "\"\\s*:\\s*\"";
    size_t pos = json.find("\"" + key + "\"");
    if (pos == std::string::npos) return "";

    size_t colon = json.find(':', pos);
    if (colon == std::string::npos) return "";

    size_t startQuote = json.find('\"', colon);
    if (startQuote == std::string::npos) return "";

    std::string val;
    bool escape = false;
    for (size_t i = startQuote + 1; i < json.size(); ++i) {
        char c = json[i];
        if (escape) {
            switch (c) {
                case 'n': val += '\n'; break;
                case 'r': val += '\r'; break;
                case 't': val += '\t'; break;
                case '\\': val += '\\'; break;
                case '\"': val += '\"'; break;
                default: val += c; break;
            }
            escape = false;
        } else if (c == '\\') {
            escape = true;
        } else if (c == '\"') {
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
            case '"': r += "\\\""; break;
            case '\\': r += "\\\\"; break;
            case '\n': r += "\\n"; break;
            case '\r': r += "\\r"; break;
            case '\t': r += "\\t"; break;
            default:
                if (c < 0x20) {
                    char b[8];
                    snprintf(b, sizeof b, "\\u%04x", c);
                    r += b;
                } else {
                    r += (char)c;
                }
        }
    }
    return r + "\"";
}

bool runCompileAndRecord(const std::string& sourceCode,
                         const std::string& filename,
                         std::string& outRecordingJson,
                         std::string& outCompileError) {
    std::string baseName = "_chronos_temp";
    std::string srcFile = baseName + ".cpp";
    std::string exeFile = baseName + ".exe";
    std::string errFile = baseName + "_compile.log";

    // Write source code to disk
    {
        std::ofstream out(srcFile, std::ios::binary);
        if (!out.is_open()) {
            outCompileError = "Failed to create temporary source file: " + srcFile;
            return false;
        }
        out.write(sourceCode.data(), sourceCode.size());
    }

    // Compile with debugging flags (-g -O0)
    std::string cmd = "g++ -g -O0 -std=c++17 \"" + srcFile + "\" -o \"" + exeFile + "\" > \"" + errFile + "\" 2>&1";
    int compileStatus = std::system(cmd.c_str());

    if (compileStatus != 0) {
        std::ifstream errIn(errFile);
        std::stringstream ss;
        ss << errIn.rdbuf();
        outCompileError = ss.str();
        if (outCompileError.empty()) {
            outCompileError = "Compilation failed with exit code " + std::to_string(compileStatus);
        }
        std::filesystem::remove(srcFile);
        std::filesystem::remove(errFile);
        return false;
    }

    // Record execution with GDB backend
    GdbBackend gdb;
    Recorder recorder(gdb);
    Timeline tl;

    bool recordSuccess = recorder.record(exeFile, tl, 500);

    // Clean up temporary files
    std::filesystem::remove(srcFile);
    std::filesystem::remove(exeFile);
    std::filesystem::remove(errFile);

    if (!recordSuccess && tl.empty()) {
        outCompileError = "Recording failed: program did not produce any execution frames.";
        return false;
    }

    std::vector<std::string> lines = splitLines(sourceCode);
    outRecordingJson = JsonExporter::toJson(tl, filename.empty() ? "main.cpp" : filename, lines);

    return true;
}

} // namespace

int main(int argc, char** argv) {
    int port = 8080;
    std::string inputFile = "";
    bool consoleOnly = false;
    bool dumpJson = false;

    // Parse CLI arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--no-server") {
            consoleOnly = true;
        } else if (arg == "--dump-json") {
            dumpJson = true;
            consoleOnly = true;
        } else if (arg == "--server" || arg == "-s") {
            if (i + 1 < argc) {
                port = std::stoi(argv[++i]);
            }
        } else if (arg.rfind(".cpp") != std::string::npos || std::filesystem::exists(arg)) {
            inputFile = arg;
        } else {
            try {
                port = std::stoi(arg);
            } catch (...) {}
        }
    }

    // If an input file was provided, record it first
    if (!inputFile.empty()) {
        std::string absPath = std::filesystem::absolute(inputFile).string();
        std::ifstream in(absPath);
        if (!in.is_open()) {
            std::cerr << "Could not open source file: " << absPath << "\n";
            return 1;
        }
        std::stringstream ss;
        ss << in.rdbuf();
        std::string code = ss.str();

        std::string recordingJson, compileErr;
        std::string fname = std::filesystem::path(absPath).filename().string();
        std::cout << "[Chronos] Compiling and recording " << fname << "...\n";

        if (!runCompileAndRecord(code, fname, recordingJson, compileErr)) {
            std::cerr << "[Chronos] Compilation/Recording failed:\n" << compileErr << "\n";
            if (consoleOnly) return 1;
        } else {
            std::lock_guard<std::mutex> lock(g_recordingMutex);
            g_currentRecordingJson = recordingJson;
            std::cout << "[Chronos] Recording generated successfully (" << recordingJson.size() << " bytes).\n";
        }

        if (consoleOnly) {
            if (dumpJson) {
                std::cout << recordingJson << "\n";
            } else {
                std::cout << "[Chronos] Console output finished (--no-server requested).\n";
            }
            return 0;
        }
    } else {
        // Try to load examples/fact.cpp as initial default if available
        if (std::filesystem::exists("examples/fact.cpp")) {
            std::ifstream in("examples/fact.cpp");
            std::stringstream ss;
            ss << in.rdbuf();
            std::string code = ss.str();
            std::string recJson, err;
            if (runCompileAndRecord(code, "fact.cpp", recJson, err)) {
                std::lock_guard<std::mutex> lock(g_recordingMutex);
                g_currentRecordingJson = recJson;
                std::cout << "[Chronos] Loaded initial sample: fact.cpp\n";
            }
        }
    }

    // Start HTTP Server
    httplib::Server svr;

    // Locate frontend directory
    std::string frontendDir = "frontend";
    if (!std::filesystem::exists(frontendDir) && std::filesystem::exists("../frontend")) {
        frontendDir = "../frontend";
    }
    svr.set_mount_point("/", frontendDir);

    // API: GET /api/recording
    svr.Get("/api/recording", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_recordingMutex);
        if (g_currentRecordingJson.empty()) {
            res.status = 404;
            res.set_content("{\"error\":\"No active recording. Run a C++ program in the Code Editor.\"}", "application/json");
        } else {
            res.status = 200;
            res.set_content(g_currentRecordingJson, "application/json; charset=utf-8");
        }
    });

    // API: GET /api/status
    svr.Get("/api/status", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
        res.set_content("{\"status\":\"ok\",\"service\":\"chronos\",\"gdb\":true}", "application/json");
    });

    // API: POST /api/run
    svr.Post("/api/run", [](const httplib::Request& req, httplib::Response& res) {
        std::string source = extractJsonString(req.body, "source");
        std::string file = extractJsonString(req.body, "file");
        if (file.empty()) file = "main.cpp";

        if (source.empty()) {
            res.status = 400;
            res.set_content("{\"success\":false,\"compileError\":\"Source code cannot be empty.\"}", "application/json");
            return;
        }

        std::cout << "[Chronos API] Received compilation request for " << file << " (" << source.size() << " bytes)\n";

        std::string recordingJson, compileError;
        bool ok = runCompileAndRecord(source, file, recordingJson, compileError);

        if (!ok) {
            std::cout << "[Chronos API] Compilation/run failed:\n" << compileError << "\n";
            std::string resp = "{\"success\":false,\"compileError\":" + escapeJsonString(compileError) + "}";
            res.status = 200; // Return 200 with success: false so client receives the detailed error payload
            res.set_content(resp, "application/json; charset=utf-8");
        } else {
            {
                std::lock_guard<std::mutex> lock(g_recordingMutex);
                g_currentRecordingJson = recordingJson;
            }
            std::cout << "[Chronos API] Execution recorded successfully.\n";
            std::string resp = "{\"success\":true,\"recording\":" + recordingJson + "}";
            res.status = 200;
            res.set_content(resp, "application/json; charset=utf-8");
        }
    });

    std::cout << "========================================================\n";
    std::cout << "  Chronos — Time-Travel Debugger IDE\n";
    std::cout << "  Open in your browser: http://localhost:" << port << "\n";
    std::cout << "========================================================\n";

    svr.listen("0.0.0.0", port);

    return 0;
}
