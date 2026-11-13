#pragma once

#include "DebuggerBackend.h"
#include "Timeline.h"
#include <string>

class Recorder {
public:
    explicit Recorder(DebuggerBackend& backend)
        : backend_(backend) {}

    bool record(const std::string& exePath, Timeline& out, int maxSteps = 500) {
        out.clear();

        if (!backend_.start(exePath)) {
            return false;
        }

        for (int step = 0; step < maxSteps; ++step) {
            Snapshot snap;
            if (!backend_.capture(snap)) {
                break;
            }
            out.add(snap);

            if (!backend_.stepLine()) {
                // If program crashed, capture the final crash state
                Snapshot crashSnap;
                if (backend_.capture(crashSnap)) {
                    out.add(crashSnap);
                }
                break;
            }
        }

        out.setNote(backend_.note());
        backend_.stop();

        return !out.empty();
    }

private:
    DebuggerBackend& backend_;
};
