#ifndef STRING_UTIL_H
#define STRING_UTIL_H

#include <string>
#include <algorithm>
#include <cctype>

namespace StringUtil {

    // Trim leading whitespace
    inline std::string trimLeft(const std::string& s) {
        size_t start = s.find_first_not_of(" \t\n\r\f\v");
        return (start == std::string::npos) ? "" : s.substr(start);
    }

    // Trim trailing whitespace
    inline std::string trimRight(const std::string& s) {
        size_t end = s.find_last_not_of(" \t\n\r\f\v");
        return (end == std::string::npos) ? "" : s.substr(0, end + 1);
    }

    // Trim leading and trailing whitespace
    inline std::string trim(const std::string& s) {
        return trimLeft(trimRight(s));
    }

    // Convert string to lowercase
    inline std::string toLower(std::string s) {
        std::transform(s.begin(), s.end(), s.begin(),
                       [](unsigned char c){ return std::tolower(c); });
        return s;
    }

    // Check if string is empty or contains only whitespace
    inline bool isBlank(const std::string& s) {
        return trim(s).empty();
    }

} // namespace StringUtil

#endif // STRING_UTIL_H
```