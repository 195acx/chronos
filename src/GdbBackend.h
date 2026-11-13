
#pragma once

#include "DebuggerBackend.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <windows.h>

class GdbBackend : public DebuggerBackend {
public:
    ~GdbBackend() override { stop(); }

    bool start(const std::string& exePath) override;
    bool capture(Snapshot& out) override;
    bool stepLine() override;
    void stop() override;

    std::string note() const override {
        return note_;
    }

private:
    std::string send(const std::string& cmd);
    std::string describePointer(
        const std::string& name,
        const std::string& value
    );

    HANDLE processHandle_ = nullptr;
    HANDLE threadHandle_ = nullptr;

    HANDLE toGdb_ = nullptr;
    HANDLE fromGdb_ = nullptr;

    bool crashed_ = false;
    std::string note_;
};
