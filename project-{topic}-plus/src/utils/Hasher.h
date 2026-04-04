#pragma once

#include <string>
#include <random> // For salt generation
#include <chrono> // For seed

namespace tm_api {
namespace utils {

class Hasher {
public:
    // For a production system, use Argon2 or bcrypt.
    // This is a *SIMPLIFIED PLACEHOLDER* for demonstration purposes.
    // DO NOT USE THIS FOR PRODUCTION.
    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& hashedPassword);

private:
    static std::string generateSalt(size_t length = 16); // 16 bytes = 32 hex chars
};

} // namespace utils
} // namespace tm_api