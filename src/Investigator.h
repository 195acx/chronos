#pragma once
#include "Timeline.h"
#include <set>
#include <string>
#include <vector>

class Investigator {
public:
    struct Diff { std::string name, before, after; };

    explicit Investigator(const Timeline& tl) : tl_(tl) {
        std::set<std::string> seen;
        for (int i = 0; i < tl_.size(); ++i)
            for (const auto& v : tl_.at(i).top().vars)
                if (seen.insert(v.name).second) names_.push_back(v.name);
    }

    const std::vector<std::string>& names() const { return names_; }

    const std::string* valueAt(int step, const std::string& name) const {
        return tl_.at(step).top().find(name);
    }

    // Next step (dir = +1) or previous step (dir = -1) where the variable changed. -1 if none.
    int nextChange(int from, const std::string& name, int dir) const {
        for (int i = from + dir; i > 0 && i < tl_.size(); i += dir) {
            const std::string* now = valueAt(i, name);
            const std::string* before = valueAt(i - 1, name);
            if (now && (!before || *now != *before)) return i;
        }
        return -1;
    }

    // First step where the variable holds a given value. -1 if never.
    int firstStepWhere(const std::string& name, const std::string& value) const {
        for (int i = 0; i < tl_.size(); ++i) {
            const std::string* v = valueAt(i, name);
            if (v && *v == value) return i;
        }
        return -1;
    }

    // Variables of the current function that differ between step a and step b.
    std::vector<Diff> compare(int a, int b) const {
        const Frame& fa = tl_.at(a).top();
        const Frame& fb = tl_.at(b).top();
        std::vector<Diff> out;
        for (const auto& x : fb.vars) {
            const std::string* y = fa.find(x.name);
            if (!y || *y != x.value) out.push_back({x.name, y ? *y : "-", x.value});
        }
        return out;
    }

private:
    const Timeline& tl_;
    std::vector<std::string> names_;
};