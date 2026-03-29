```cpp
#include "PasswordUtils.hpp"
#include "Logger.hpp"
#include <random>
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill

// For demonstration, a very simple and INSECURE hashing.
// DO NOT USE IN PRODUCTION. Replace with a proper library (e.g., Argon2, scrypt, bcrypt).
namespace PWDUtils {

    // Simple pseudo-hashing for demonstration purposes.
    // In a real app, use a strong KDF like Argon2, scrypt, or bcrypt.
    std::string simpleHash(const std::string& password, const std::string& salt) {
        std::string salted_password = password + salt;
        std::hash<std::string> hasher;
        size_t hash_val = hasher(salted_password);
        std::stringstream ss;
        ss << std::hex << std::setw(16) << std::setfill('0') << hash_val;
        return ss.str();
    }

    std::string generateSalt() {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> distrib(0, 255);
        std::stringstream ss;
        for (int i = 0; i < 16; ++i) { // 16-byte salt
            ss << std::hex << std::setw(2) << std::setfill('0') << distrib(gen);
        }
        return ss.str();
    }

    std::string hashPassword(const std::string& password) {
        std::string salt = generateSalt();
        std::string hashed = simpleHash(password, salt);
        // Store hash and salt together, separated by a delimiter
        return salt + "$" + hashed;
    }

    bool verifyPassword(const std::string& password, const std::string& hashed_password_with_salt) {
        size_t delimiter_pos = hashed_password_with_salt.find('$');
        if (delimiter_pos == std::string::npos) {
            Logger::log(LogLevel::ERROR, "Invalid hashed password format.");
            return false;
        }
        std::string salt = hashed_password_with_salt.substr(0, delimiter_pos);
        std::string stored_hash = hashed_password_with_salt.substr(delimiter_pos + 1);

        std::string calculated_hash = simpleHash(password, salt);

        return calculated_hash == stored_hash;
    }
}
```