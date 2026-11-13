
#include "GdbBackend.h"


#include <regex>
#include <sstream>
#include <vector>

namespace {

std::vector<std::string> splitLines(const std::string& s) {
    std::vector<std::string> out;
    std::istringstream in(s);
    std::string line;

    while (std::getline(in, line)) {
        out.push_back(line);
    }

    return out;
}

std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");

    return a == std::string::npos
        ? ""
        : s.substr(a, b - a + 1);
}

// Parse GDB output such as:
// n=3, p=0x1, s={a=1, b=2}
std::vector<Variable> parseArgs(const std::string& s) {
    std::vector<Variable> out;
    std::string part;
    int depth = 0;

    auto flush = [&]() {
        size_t eq = part.find('=');

        if (eq != std::string::npos) {
            out.push_back({
                trim(part.substr(0, eq)),
                trim(part.substr(eq + 1))
            });
        }

        part.clear();
    };

    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') depth++;
        if (c == ')' || c == '}' || c == ']') depth--;

        if (c == ',' && depth == 0) {
            flush();
        } else {
            part += c;
        }
    }

    flush();
    return out;
}

} // namespace


// Send one command to GDB and read its response.
// The marker tells us when GDB has finished responding.
std::string GdbBackend::send(const std::string& cmd) {

    if (!toGdb_ || !fromGdb_) {
        return "";
    }

    std::string command = cmd + "\necho @@END@@\\n\n";

    DWORD written = 0;

    if (!WriteFile(
            toGdb_,
            command.data(),
            static_cast<DWORD>(command.size()),
            &written,
            nullptr)) {
        return "";
    }

    std::string buffer;
    char temp[4096];

    while (buffer.find("@@END@@") == std::string::npos) {

        DWORD bytesRead = 0;

        BOOL success = ReadFile(
            fromGdb_,
            temp,
            sizeof(temp),
            &bytesRead,
            nullptr
        );

        if (!success || bytesRead == 0) {
            break;
        }

        buffer.append(temp, bytesRead);
    }

    return buffer;
}


// If a variable is a pointer, follow it and show what it points to.
// Follows "next" links so a linked list shows its nodes.
std::string GdbBackend::describePointer(
    const std::string& name,
    const std::string& value) {

    static const std::regex ptrRe(
        R"(^(?:\([^)]*\)\s*)?(0x[0-9a-f]+)$)"
    );

    static const std::regex nextRe(
        R"(\bnext = (?:\([^)]*\)\s*)?(0x[0-9a-f]+))"
    );

    std::smatch pm;

    if (!std::regex_match(value, pm, ptrRe)) {
        return value;
    }

    if (pm[1].str() == "0x0") {
        return "nullptr";
    }

    std::string result = value;
    std::string path = name;

    for (int hop = 0; hop < 8; ++hop) {

        std::string response = send("print *" + path);

        size_t marker = response.find("@@END@@");

        if (marker != std::string::npos) {
            response.erase(marker);
        }

        response = trim(response);

        size_t eq = response.find(" = ");

        if (response.rfind("$", 0) != 0 ||
            eq == std::string::npos) {
            break;
        }

        std::string text = trim(response.substr(eq + 3));

        result += " -> " + text;

        std::smatch nm;

        if (!std::regex_search(text, nm, nextRe)) {
            break;
        }

        if (nm[1].str() == "0x0") {
            result += " -> nullptr";
            break;
        }

        path += "->next";
    }

    return result;
}


// Launch GDB as a separate Windows process.
bool GdbBackend::start(const std::string& exePath) {

    stop();

    crashed_ = false;
    note_.clear();

    SECURITY_ATTRIBUTES security{};
    security.nLength = sizeof(SECURITY_ATTRIBUTES);
    security.bInheritHandle = TRUE;

    HANDLE childStdinRead = nullptr;
    HANDLE parentStdinWrite = nullptr;

    HANDLE parentStdoutRead = nullptr;
    HANDLE childStdoutWrite = nullptr;

    // Create pipe for commands sent to GDB.
    if (!CreatePipe(
            &childStdinRead,
            &parentStdinWrite,
            &security,
            0)) {
        return false;
    }

    // Create pipe for output received from GDB.
    if (!CreatePipe(
            &parentStdoutRead,
            &childStdoutWrite,
            &security,
            0)) {

        CloseHandle(childStdinRead);
        CloseHandle(parentStdinWrite);

        return false;
    }

    // Parent-side pipe handles must not be inherited.
    SetHandleInformation(
        parentStdinWrite,
        HANDLE_FLAG_INHERIT,
        0
    );

    SetHandleInformation(
        parentStdoutRead,
        HANDLE_FLAG_INHERIT,
        0
    );

    STARTUPINFOA startup{};
    startup.cb = sizeof(STARTUPINFOA);

    startup.dwFlags = STARTF_USESTDHANDLES;
    startup.hStdInput = childStdinRead;
    startup.hStdOutput = childStdoutWrite;
    startup.hStdError = childStdoutWrite;

    PROCESS_INFORMATION process{};

    std::string commandLine =
        "gdb.exe -q --nx --args \"" + exePath + "\"";

    std::vector<char> mutableCommand(
        commandLine.begin(),
        commandLine.end()
    );

    mutableCommand.push_back('\0');

    BOOL created = CreateProcessA(
        nullptr,
        mutableCommand.data(),
        nullptr,
        nullptr,
        TRUE,
        CREATE_NO_WINDOW,
        nullptr,
        nullptr,
        &startup,
        &process
    );

    // Parent no longer needs the child's pipe ends.
    CloseHandle(childStdinRead);
    CloseHandle(childStdoutWrite);

    if (!created) {

        CloseHandle(parentStdinWrite);
        CloseHandle(parentStdoutRead);

        return false;
    }

    processHandle_ = process.hProcess;
    threadHandle_ = process.hThread;

    toGdb_ = parentStdinWrite;
    fromGdb_ = parentStdoutRead;

    // Configure GDB.
    send("set pagination off");
    send("set confirm off");
    send("set width 0");
    send("set height 0");

    send("break main");

    // Run the program.
    // We do not use /dev/null because this is Windows.
    std::string response = send("run");

    if (response.find("Breakpoint 1,") == std::string::npos) {
        stop();
        return false;
    }

    return true;
}


// Capture the current program state.
bool GdbBackend::capture(Snapshot& snap) {

    snap.stack.clear();

    static const std::regex frameRe(
        R"(#(\d+)\s+(?:0x[0-9a-f]+ in )?(\S+) \((.*)\) at [^:]+:(\d+))"
    );

    static const std::regex localRe(
        R"((\w+) = (.*))"
    );

    std::vector<Frame> frames;

    // Get the current call stack.
    for (const std::string& line : splitLines(send("bt"))) {

        std::smatch m;

        if (!std::regex_search(line, m, frameRe)) {
            continue;
        }

        Frame frame;

        frame.func = m[2].str();
        frame.line = std::stoi(m[4].str());

        // Function arguments.
        frame.vars = parseArgs(m[3].str());

        send("frame " + m[1].str());

        // Local variables.
        for (const std::string& local : splitLines(send("info locals"))) {

            std::smatch lm;

            if (std::regex_match(local, lm, localRe)) {

                frame.vars.push_back({
                    lm[1].str(),
                    lm[2].str()
                });
            }
        }

        // Expand pointer values.
        for (auto& variable : frame.vars) {
            variable.value = describePointer(
                variable.name,
                variable.value
            );
        }

        frames.push_back(frame);
    }

    send("frame 0");

    if (frames.empty() || frames.back().func != "main") {
        return false;
    }

    // Store main first and current function last.
    snap.stack.assign(frames.rbegin(), frames.rend());

    return true;
}


// Advance execution by one source line.
bool GdbBackend::stepLine() {

    if (crashed_) {
        return false;
    }

    std::string response = send("step");

    auto has = [&](const char* text) {
        return response.find(text) != std::string::npos;
    };

    if (has("exited normally") ||
        has("exited with code") ||
        has("not being run") ||
        has("terminated with signal")) {

        return false;
    }

    size_t position = response.find("received signal");
    if (position == std::string::npos) {
        position = response.find("Program received signal");
    }

    if (position != std::string::npos) {

        crashed_ = true;

        // Try to start from line beginning if possible
        size_t lineStart = response.rfind('\n', position);
        lineStart = (lineStart == std::string::npos) ? 0 : lineStart + 1;

        size_t end = response.find('\n', position);

        note_ = trim(
            response.substr(
                lineStart,
                end == std::string::npos
                    ? std::string::npos
                    : end - lineStart
            )
        );
    }

    return true;
}


// Stop GDB and release Windows resources.
void GdbBackend::stop() {

    if (toGdb_) {

        send("kill");
        send("quit");

        CloseHandle(toGdb_);
        toGdb_ = nullptr;
    }

    if (processHandle_) {

        DWORD result = WaitForSingleObject(
            processHandle_,
            2000
        );

        if (result == WAIT_TIMEOUT) {
            TerminateProcess(processHandle_, 1);
            WaitForSingleObject(processHandle_, 1000);
        }

        CloseHandle(processHandle_);
        processHandle_ = nullptr;
    }

    if (threadHandle_) {
        CloseHandle(threadHandle_);
        threadHandle_ = nullptr;
    }

    if (fromGdb_) {
        CloseHandle(fromGdb_);
        fromGdb_ = nullptr;
    }
}
