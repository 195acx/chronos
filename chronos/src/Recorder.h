#pragma once
#include "DebuggerBackend.h"
#include "Timeline.h"

class Recorder {
public:
    explicit Recorder(DebuggerBackend& backend) : be_(backend) {}

    bool record(const std::string& exe, Timeline& tl, int maxSteps) {
        if (!be_.start(exe)) return false;
        Snapshot s;
        while (tl.size() < maxSteps && be_.capture(s)) {
            tl.add(s);
            if (!be_.stepLine()) break;
        }
        tl.setNote(be_.note());
        be_.stop();
        return tl.size() > 0;
    }

private:
    DebuggerBackend& be_;
};