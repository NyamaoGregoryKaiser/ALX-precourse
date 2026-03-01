#include "PasswordHasher.h"
#include <drogon/utils/crypto/Blake2b.h> // Using Drogon's crypto for demo.
                                          // For bcrypt, you'd typically use external lib.
#include <drogon/drogon.h> // For LOG_ERROR
#include <crypt.h> // For bcrypt on systems that have it (e.g., Linux with glibc)
// If crypt.h is not available or you want cross-platform bcrypt:
// #include <bcrypt/BCrypt.hpp> // Example for a dedicated bcrypt-cpp library

// A note on bcrypt in C++:
// The `crypt` function from `unistd.h` (or `crypt.h` on some systems) provides bcrypt
// but its availability and exact behavior can vary across systems.
// For a truly cross-platform and robust solution, one would typically use a C++ wrapper
// around a battle-tested C library like libsodium or OpenSSL's crypto functions,
// or a dedicated C++ bcrypt library.
// For this example, we'll assume `crypt.h` is available and configure `CRYPT_BLOWFISH`
// for bcrypt hashing. If not, a simpler hash (e.g., SHA256) is used for demo purposes,
// which is *NOT* suitable for production passwords.

namespace PasswordHasher {

    std::string hashPassword(const std::string& plainPassword) {
        // In a production environment, ensure you are using a strong, adaptive hashing algorithm
        // like bcrypt, scrypt, or Argon2. Using simple SHA256/512 for passwords is INSECURE.
        // The `crypt` function with `_XOPEN_SOURCE` and `CRYPT_BLOWFISH` can provide bcrypt.

        // For a portable Drogon/C++ solution without external bcrypt-cpp, we can define a salt
        // and use crypt(). If that fails or is not available, fall back to a less secure hash
        // *for demonstration only*.

        #ifdef _XOPEN_SOURCE // Check for POSIX compatibility
        #define _XOPEN_SOURCE // Required for crypt() on some systems
        #endif

        #ifdef CRYPT_BLOWFISH // Check if bcrypt is supported by crypt()
            // Generate a salt for bcrypt. bcrypt salts are typically 16 characters.
            // crypt_gensalt_rn is preferred for thread safety but complex.
            // For simplicity, manually create a salt or use a library that handles it.
            // A simple approach: "$2a$[cost]$[salt]"
            char salt[64]; // Max size for salt
            if (crypt_gensalt_rn("$2a$", 8 /*cost*/, nullptr, 0, salt, sizeof(salt)) == nullptr) {
                LOG_ERROR << "Failed to generate bcrypt salt.";
                return ""; // Indicate failure
            }

            char *hashed = crypt(plainPassword.c_str(), salt);
            if (hashed) {
                return std::string(hashed);
            } else {
                LOG_ERROR << "Failed to hash password with bcrypt (crypt() failed).";
                return "";
            }
        #else
            // FALLBACK for systems without crypt.h or CRYPT_BLOWFISH.
            // This is **NOT SECURE** for production passwords. Use a proper library.
            LOG_WARN << "bcrypt (crypt.h) not available or CRYPT_BLOWFISH not defined. Using SHA256 as fallback (INSECURE for passwords).";
            return drogon::utils::blake2b(plainPassword); // Placeholder: Blake2b is a strong hash but not for passwords.
        #endif
    }

    bool verifyPassword(const std::string& plainPassword, const std::string& hashedPassword) {
        if (plainPassword.empty() || hashedPassword.empty()) {
            return false;
        }

        #ifdef CRYPT_BLOWFISH
            // The crypt() function with a bcrypt hash automatically extracts the salt
            // from the hashed password and uses it.
            char *hashed = crypt(plainPassword.c_str(), hashedPassword.c_str());
            if (hashed) {
                return hashedPassword == std::string(hashed);
            } else {
                LOG_ERROR << "Failed to verify password with bcrypt (crypt() failed).";
                return false;
            }
        #else
            // Fallback verification for non-bcrypt hashing.
            return hashPassword(plainPassword) == hashedPassword; // Compares using the fallback hash
        #endif
    }

} // namespace PasswordHasher
```