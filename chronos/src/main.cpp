#include "GdbBackend.h"
#include "Investigator.h"
#include "JsonExporter.h"
#include "Recorder.h"
#include "Timeline.h"
#include "httplib.h"
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: chronos yourfile.cpp [max_steps]\n";
        return 1;
    }
    const std::string src = std::filesystem::absolute(argv[1]).string();
    const int limit = argc > 2 ? std::atoi(argv[2]) : 500;
    const std::string exe = src + ".chronos.out";

    // 1. Compile with debug info
    std::string cmd = "g++ -g -O0 -std=c++17 \"" + src + "\" -o \"" + exe + "\" 2>&1";
    if (std::system(cmd.c_str()) != 0) {
        std::cerr << "Compile failed.\n";
        return 1;
    }

    // 2. Record the run
    GdbBackend gdb;
    Recorder recorder(gdb);
    Timeline timeline;
    if (!recorder.record(exe, timeline, limit)) {
        std::cerr << "Recording failed. Is gdb installed?\n";
        return 1;
    }
    std::cout << "Recorded " << timeline.size() << " steps.\n";

    // 3. Read the source file for display
    std::vector<std::string> lines;
    std::ifstream in(src);
    for (std::string l; std::getline(in, l);) lines.push_back(l);

    // 4. Turn the recording into JSON and save a copy
    const std::string json = JsonExporter::toJson(
        timeline, std::filesystem::path(src).filename().string(), lines);
    std::ofstream("recording.json") << json;

    // 5. Serve the API and the frontend folder
    httplib::Server svr;
    svr.Get("/api/recording", [&](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_content(json, "application/json");
    });
    svr.set_mount_point("/", "./frontend");

    std::cout << "Open http://localhost:8080 (Ctrl+C to stop)\n";
    svr.listen("0.0.0.0", 8080);
}