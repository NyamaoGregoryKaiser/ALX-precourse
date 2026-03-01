#ifndef PASSWORD_HASHER_H
#define PASSWORD_HASHER_H

#include <string>

// Requires crypt library (libcrypto from OpenSSL or libxcrypt)
// On Linux: -lcrypt
// On some systems, bcrypt might be part of OpenSSL, or a separate library.
// For simplicity in this example, we'll assume crypt() or a basic implementation exists
// For real-world, use Argon2 or scrypt, or at least a strong bcrypt library like OpenSSL's.
// Drogon itself doesn't directly provide a bcrypt impl, so we need a separate library.
// For this example, we'll simulate it, or rely on a `crypt` implementation.
// In a real Conan setup, you'd use `open_ssl/x.y.z` and `bcrypt-cpp` for a portable solution.

// For demonstration, we'll use a placeholder for actual bcrypt operations.
// A real production system *must* use a robust, well-vetted cryptographic library.

namespace PasswordHasher {

    /**
     * @brief Hashes a plain password using a strong hashing algorithm (e.g., bcrypt).
     * @param plainPassword The plain text password.
     * @return The hashed password string. Returns an empty string on error.
     */
    std::string hashPassword(const std::string& plainPassword);

    /**
     * @brief Verifies a plain password against a hashed password.
     * @param plainPassword The plain text password to verify.
     * @param hashedPassword The stored hashed password.
     * @return True if the password matches, false otherwise.
     */
    bool verifyPassword(const std::string& plainPassword, const std::string& hashedPassword);

} // namespace PasswordHasher

#endif // PASSWORD_HASHER_H
```