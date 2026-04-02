```cpp
#ifndef STRING_UTIL_H
#define STRING_UTIL_H

#include <string>
#include <vector>
#include <algorithm>
#include <cctype>

namespace TaskManager {
namespace Utils {

class StringUtil {
public:
    static std::string trim(const std::string& str) {
        size_t first = str.find_first_not_of(" \t\n\r");
        if (std::string::npos == first) {
            return str;
        }
        size_t last = str.find_last_not_of(" \t\n\r");
        return str.substr(first, (last - first + 1));
    }

    static std::string toLower(std::string str) {
        std::transform(str.begin(), str.end(), str.begin(),
                       [](unsigned char c){ return std::tolower(c); });
        return str;
    }

    static std::vector<std::string> split(const std::string& s, char delimiter) {
        std::vector<std::string> tokens;
        std::string token;
        std::istringstream tokenStream(s);
        while (std::getline(tokenStream, token, delimiter)) {
            tokens.push_back(token);
        }
        return tokens;
    }

    // Simple hash for passwords (for demonstration, a real app would use a strong KDF like Argon2)
    static std::string hashPassword(const std::string& password) {
        // In a real application, use a proper cryptographic hash function with salt (e.g., Argon2, scrypt, bcrypt).
        // For demonstration, a simple SHA256 (conceptual) or just returning the password for clarity.
        // Here, a placeholder indicating where a proper hashing would occur.
        // For SQLite, typically bcrypt is generated externally or a C library is used.
        // Let's use a simple placeholder to represent a 'hashed' password.
        // This is NOT secure for production.
        return "{SALT_HASH_PLACEHOLDER}" + password + "_hashed";
    }

    // Simple verification (for demonstration)
    static bool verifyPassword(const std::string& plainPassword, const std::string& hashedPassword) {
        // In a real application, use the same KDF and salt to verify.
        return hashPassword(plainPassword) == hashedPassword;
    }
};

} // namespace Utils
} // namespace TaskManager

#endif // STRING_UTIL_H
```