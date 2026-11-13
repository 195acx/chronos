#pragma once

#include "Snapshot.h"
#include <string>
#include <vector>

class Timeline {
public:
    Timeline() = default;

    void add(const Snapshot& s) {
        snapshots_.push_back(s);
    }

    int size() const {
        return static_cast<int>(snapshots_.size());
    }

    bool empty() const {
        return snapshots_.empty();
    }

    const Snapshot& at(int index) const {
        return snapshots_.at(index);
    }

    void clear() {
        snapshots_.clear();
        note_.clear();
    }

    void setNote(const std::string& note) {
        note_ = note;
    }

    const std::string& note() const {
        return note_;
    }

private:
    std::vector<Snapshot> snapshots_;
    std::string note_;
};
