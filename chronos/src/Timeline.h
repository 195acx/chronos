#pragma once
#include "Snapshot.h"
#include <algorithm>
#include <string>
#include <vector>

class Timeline {
public:
    void add(const Snapshot& s) { snaps_.push_back(s); }
    int size() const { return (int)snaps_.size(); }
    const Snapshot& at(int i) const { return snaps_.at(i); }
    int clamp(int i) const { return std::max(0, std::min(size() - 1, i)); }
    void setNote(const std::string& n) { note_ = n; }
    const std::string& note() const { return note_; }

private:
    std::vector<Snapshot> snaps_;
    std::string note_;
};