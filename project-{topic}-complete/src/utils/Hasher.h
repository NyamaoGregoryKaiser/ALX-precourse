```cpp
#ifndef HASHER_H
#define HASHER_H

#include <string>
#include <vector> // Required for bcrypt to store salt/hash

// For a real production system, use a robust library like Argon2, bcrypt, or scrypt.
// This is a simplified conceptual example. For bcrypt, you'd typically include a header
// like <bcrypt.h> from a C library or a C++ wrapper.
// Example: https://github.com/mariuself/bcrypt-cpp

namespace PaymentProcessor {
namespace Utils {

class Hasher {
public:
    // Hashes a plain password using a strong hashing algorithm (e.g., bcrypt).
    // In a real scenario, this would involve a library call.
    static std::string hashPassword(const std::string& password) {
        // --- REAL IMPLEMENTATION WOULD USE A LIBRARY LIKE bcrypt-cpp ---
        // char salt[BCRYPT_SALTSZ];
        // bcrypt_gensalt(10, salt); // 10 rounds
        // char hashed[BCRYPT_HASHSZ];
        // bcrypt_hashpw(password.c_str(), salt, hashed);
        // return std::string(hashed);
        // --- END REAL IMPLEMENTATION ---

        // Simplified placeholder:
        // In a real system, DO NOT use simple SHA256 for passwords directly.
        // It's susceptible to rainbow table attacks and brute force.
        // This is purely for demonstrating the interface.
        std::hash<std::string> hasher;
        return std::to_string(hasher(password + "some_static_salt_for_demo_only"));
    }

    // Verifies a plain password against a stored hash.
    static bool verifyPassword(const std::string& password, const std::string& storedHash) {
        // --- REAL IMPLEMENTATION WOULD USE A LIBRARY LIKE bcrypt-cpp ---
        // return bcrypt_checkpw(password.c_str(), storedHash.c_str()) == 0;
        // --- END REAL IMPLEMENTATION ---

        // Simplified placeholder:
        return hashPassword(password) == storedHash;
    }
};

} // namespace Utils
} // namespace PaymentProcessor

#endif // HASHER_H
```