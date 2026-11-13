#pragma once
#include "DebuggerBackend.h"
#include <sys/types.h>

class GdbBackend : public DebuggerBackend {
public:
    ~GdbBackend() override { stop(); }
    bool start(const std::string& exePath) override;
    bool capture(Snapshot& out) override;
    bool stepLine() override;
    void stop() override;
    std::string note() const override { return note_; }

private:
    std::string send(const std::string& cmd);   // send one GDB command, return its output
    pid_t pid_ = -1;
    int toGdb_ = -1, fromGdb_ = -1;
    bool crashed_ = false;
    std::string note_;
};