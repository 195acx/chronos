#pragma once
#include <string>
#include <vector>

struct Variable {
    std::string name, value;
};

struct Frame {                       // one function call on the stack
    std::string func;
    int line = 0;
    std::vector<Variable> vars;      // arguments + locals

    const std::string* find(const std::string& n) const {
        for (const auto& v : vars)
            if (v.name == n) return &v.value;
        return nullptr;
    }
};

class Snapshot {                     // the program state at one moment
public:
    std::vector<Frame> stack;        // stack[0] is main, last is the current function
    const Frame& top() const { return stack.back(); }
    int depth() const { return (int)stack.size(); }
};