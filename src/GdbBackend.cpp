#include "GdbBackend.h"
#include <cstring>
#include <regex>
#include <signal.h>
#include <sstream>
#include <sys/wait.h>
#include <unistd.h>

namespace {
std::vector<std::string> splitLines(const std::string& s) {
    std::vector<std::string> out;
    std::istringstream in(s);
    std::string l;
    while (std::getline(in, l)) out.push_back(l);
    return out;
}

std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
    return a == std::string::npos ? "" : s.substr(a, b - a + 1);
}

// "n=3, p=0x1, s={a=1, b=2}" -> name/value pairs (splits only on top-level commas)
std::vector<Variable> parseArgs(const std::string& s) {
    std::vector<Variable> out;
    std::string part;
    int depth = 0;
    auto flush = [&]() {
        size_t eq = part.find('=');
        if (eq != std::string::npos)
            out.push_back({trim(part.substr(0, eq)), trim(part.substr(eq + 1))});
        part.clear();
    };
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') depth++;
        if (c == ')' || c == '}' || c == ']') depth--;
        if (c == ',' && depth == 0) flush();
        else part += c;
    }
    flush();
    return out;
}
}  // namespace

std::string GdbBackend::send(const std::string& cmd) {
    // The echo line prints a marker so we know when GDB has finished answering.
    std::string line = cmd + "\necho @@END@@\\n\n";
    if (write(toGdb_, line.data(), line.size()) < 0) return "";
    std::string buf;
    char tmp[4096];
    while (buf.find("@@END@@") == std::string::npos) {
        ssize_t n = read(fromGdb_, tmp, sizeof tmp);
        if (n <= 0) break;
        buf.append(tmp, n);
    }
    return buf;
}

// If a variable is a pointer, follow it and show what it points to.
// Follows "next" links so a linked list shows all its nodes.
std::string GdbBackend::describePointer(const std::string& name, const std::string& value) {
    static const std::regex ptrRe(R"(^(?:\([^)]*\)\s*)?(0x[0-9a-f]+)$)");
    static const std::regex nextRe(R"(\bnext = (?:\([^)]*\)\s*)?(0x[0-9a-f]+))");
    std::smatch pm;
    if (!std::regex_match(value, pm, ptrRe)) return value;      // not a plain pointer
    if (pm[1].str() == "0x0") return "nullptr";

    std::string result = value;
    std::string path = name;
    for (int hop = 0; hop < 8; ++hop) {                          // follow at most 8 nodes
        std::string r = send("print *" + path);
        size_t m = r.find("@@END@@");
        if (m != std::string::npos) r.erase(m);                  // remove the end marker
        r = trim(r);
        size_t eq = r.find(" = ");
        if (r.rfind("$", 0) != 0 || eq == std::string::npos) break;   // error: cannot dereference
        std::string text = trim(r.substr(eq + 3));
        result += " -> " + text;

        std::smatch nm;
        if (!std::regex_search(text, nm, nextRe)) break;         // no "next" field: stop here
        if (nm[1].str() == "0x0") { result += " -> nullptr"; break; }
        path += "->next";
    }
    return result;
}

bool GdbBackend::start(const std::string& exe) {
    signal(SIGPIPE, SIG_IGN);
    int in[2], out[2];
    if (pipe(in) != 0 || pipe(out) != 0) return false;
    pid_ = fork();
    if (pid_ < 0) return false;
    if (pid_ == 0) {                                  // child: becomes GDB
        dup2(in[0], STDIN_FILENO);
        dup2(out[1], STDOUT_FILENO);
        dup2(out[1], STDERR_FILENO);
        close(in[0]); close(in[1]); close(out[0]); close(out[1]);
        execlp("gdb", "gdb", "-q", "--nx", "--args", exe.c_str(), (char*)nullptr);
        _exit(127);
    }
    close(in[0]);
    close(out[1]);
    toGdb_ = in[1];
    fromGdb_ = out[0];

    send("set prompt");                               // remove the "(gdb) " prompt from the output
    send("set pagination off");
    send("set confirm off");
    send("set width 0");
    send("set height 0");
    send("skip -gfi /usr/*");                         // never step into system library code
    send("break main");
    std::string r = send("run < /dev/null > /dev/null");
    return r.find("Breakpoint 1,") != std::string::npos;
}

bool GdbBackend::capture(Snapshot& snap) {
    snap.stack.clear();
    static const std::regex frameRe(
        R"(#(\d+)\s+(?:0x[0-9a-f]+ in )?(\S+) \((.*)\) at [^:]+:(\d+))");
    static const std::regex localRe(R"((\w+) = (.*))");

    std::vector<Frame> frames;                        // innermost first
    for (const std::string& line : splitLines(send("bt"))) {
        std::smatch m;
        if (!std::regex_search(line, m, frameRe)) continue;
        Frame f;
        f.func = m[2].str();
        f.line = std::stoi(m[4].str());
        f.vars = parseArgs(m[3].str());               // arguments come from the bt line
        send("frame " + m[1].str());
        for (const std::string& l : splitLines(send("info locals"))) {
            std::smatch lm;
            if (std::regex_match(l, lm, localRe))
                f.vars.push_back({lm[1].str(), lm[2].str()});
        }
        for (auto& v : f.vars) v.value = describePointer(v.name, v.value);
        frames.push_back(f);
    }
    send("frame 0");

    if (frames.empty() || frames.back().func != "main") return false;  // left user code
    snap.stack.assign(frames.rbegin(), frames.rend());                 // main first
    return true;
}

bool GdbBackend::stepLine() {
    if (crashed_) return false;
    std::string r = send("step");
    auto has = [&](const char* s) { return r.find(s) != std::string::npos; };
    if (has("exited normally") || has("exited with code") ||
        has("not being run") || has("terminated with signal"))
        return false;

    // Match both "Program received signal" and "Thread N received signal" (GDB 7+)
    size_t p = r.find("received signal");
    if (p != std::string::npos) {
        crashed_ = true;
        // Grab from start of that line
        size_t lineStart = r.rfind('\n', p);
        lineStart = (lineStart == std::string::npos) ? 0 : lineStart + 1;
        size_t end = r.find('\n', p);
        note_ = trim(r.substr(lineStart,
            end == std::string::npos ? std::string::npos : end - lineStart));
    }
    return true;
}

void GdbBackend::stop() {
    if (toGdb_ >= 0) {
        const char* q = "kill\nquit\n";
        if (write(toGdb_, q, strlen(q)) < 0) {}
        close(toGdb_);
        toGdb_ = -1;
    }
    if (pid_ > 0) { waitpid(pid_, nullptr, 0); pid_ = -1; }
    if (fromGdb_ >= 0) { close(fromGdb_); fromGdb_ = -1; }
}
