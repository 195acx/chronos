#pragma once
#include "Snapshot.h"
#include <string>

// Abstract interface: Chronos does not care which debugger sits underneath.
class DebuggerBackend {
public:
    virtual ~DebuggerBackend() = default;
    virtual bool start(const std::string& exePath) = 0;  // run to main()
    virtual bool capture(Snapshot& out) = 0;             // read the current state
    virtual bool stepLine() = 0;                         // false when program is over
    virtual void stop() = 0;
    virtual std::string note() const { return ""; }      // e.g. crash message
};