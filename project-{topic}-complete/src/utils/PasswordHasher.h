```cpp
#pragma once

#include <string>
#include <stdexcept>

namespace PasswordHasher {
    // Hashes a plain-text password using Argon2.
    // Returns the full Argon2 hash string.
    std::string hashPassword(const std::string& password);

    // Verifies a plain-text password against an Argon2 hash.
    // Returns true if the password matches the hash, false otherwise.
    bool verifyPassword(const std::string& password, const std::string& hash);

    // Custom exception for hashing errors
    class HashingException : public std::runtime_error {
    public:
        explicit HashingException(const std::string& message)
            : std::runtime_error("Hashing Error: " + message) {}
    };
}
```