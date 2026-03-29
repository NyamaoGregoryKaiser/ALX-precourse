```cpp
#ifndef PASSWORD_UTILS_HPP
#define PASSWORD_UTILS_HPP

#include <string>

// A simple utility for password hashing (e.g., using a mock or basic bcrypt-like function)
// In a real application, a robust library like Argon2 or bcrypt would be integrated.
namespace PWDUtils {
    // Hashes a plain-text password. Returns the hashed string.
    std::string hashPassword(const std::string& password);

    // Verifies a plain-text password against a hashed password. Returns true if they match.
    bool verifyPassword(const std::string& password, const std::string& hashed_password);
}

#endif // PASSWORD_UTILS_HPP
```