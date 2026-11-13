#include "GdbBackend.h"
#include "Recorder.h"
#include "Timeline.h"
#include <cstdlib>
#include <filesystem>
#include <iostream>

int main(int argc, char** argv) {
    if (argc < 2) { std::cerr << "Usage: chronos file.cpp\n"; return 1; }
    std::string src = std::filesystem::absolute(argv[1]).string();
    std::string exe = src + ".chronos.out";

    std::string cmd = "g++ -g -O0 -std=c++17 \"" + src + "\" -o \"" + exe + "\" 2>&1";
    if (std::system(cmd.c_str()) != 0) { std::cerr << "Compile failed\n"; return 1; }

    GdbBackend gdb;
    Recorder recorder(gdb);
    Timeline tl;
    if (!recorder.record(exe, tl, 500)) { std::cerr << "Recording failed\n"; return 1; }

    for (int i = 0; i < tl.size(); ++i) {
        const Frame& f = tl.at(i).top();
        std::cout << i + 1 << ": " << f.func << "() line " << f.line
                  << " depth " << tl.at(i).depth() << "  ";
        for (const auto& v : f.vars) std::cout << v.name << "=" << v.value << " ";
        std::cout << "\n";
    }
}