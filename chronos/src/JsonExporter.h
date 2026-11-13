#pragma once
#include "Timeline.h"
#include <cstdio>
#include <sstream>

class JsonExporter {
public:
    static std::string toJson(const Timeline& tl, const std::string& file,
                              const std::vector<std::string>& source) {
        std::ostringstream o;
        o << "{\"file\":" << str(file) << ",\"note\":" << str(tl.note()) << ",\"source\":[";
        for (size_t i = 0; i < source.size(); ++i) o << (i ? "," : "") << str(source[i]);
        o << "],\"steps\":[";
        for (int i = 0; i < tl.size(); ++i) {
            o << (i ? "," : "") << "{\"stack\":[";
            const Snapshot& s = tl.at(i);
            for (int j = 0; j < s.depth(); ++j) {
                const Frame& f = s.stack[j];
                o << (j ? "," : "") << "{\"func\":" << str(f.func) << ",\"line\":" << f.line << ",\"locals\":{";
                for (size_t k = 0; k < f.vars.size(); ++k)
                    o << (k ? "," : "") << str(f.vars[k].name) << ":" << str(f.vars[k].value);
                o << "}}";
            }
            o << "]}";
        }
        o << "]}";
        return o.str();
    }

private:
    static std::string str(const std::string& s) {       // JSON-safe quoted string
        std::string r = "\"";
        for (unsigned char c : s) {
            switch (c) {
                case '"': r += "\\\""; break;
                case '\\': r += "\\\\"; break;
                case '\n': r += "\\n"; break;
                case '\r': r += "\\r"; break;
                case '\t': r += "\\t"; break;
                default:
                    if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); r += b; }
                    else r += (char)c;
            }
        }
        return r + "\"";
    }
};