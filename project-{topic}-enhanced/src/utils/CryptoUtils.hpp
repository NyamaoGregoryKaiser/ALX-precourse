```cpp
#ifndef CRYPTO_UTILS_HPP
#define CRYPTO_UTILS_HPP

#include <string>
#include <vector>

// CryptoUtils provides cryptographic helper functions like password hashing and JWT signing.
// IMPORTANT: For production, use established libraries for password hashing like Argon2 or Bcrypt,
// and dedicated JWT libraries (e.g., jwt-cpp, Opaque-JWT) for robustness and security against known attacks.
// The SHA256 and HMAC-SHA256 implementations here are for demonstration of principles.
class CryptoUtils {
public:
    // Generates a random salt string suitable for password hashing.
    // @param length The desired length of the raw salt bytes before Base64 encoding.
    // @return A Base64 encoded string representing the random salt.
    static std::string generateSalt(size_t length = 16);

    // Hashes a password using SHA256 with a randomly generated salt.
    // The returned string is formatted as "salt$hash", where salt is Base64 encoded.
    // @param password The plain-text password to hash.
    // @return The combined salt and hash string.
    static std::string hashPassword(const std::string& password);

    // Verifies a plain-text password against a stored hashed password.
    // The stored hash should be in "salt$hash" format.
    // @param password The plain-text password to verify.
    // @param storedHash The stored hashed password string (including salt).
    // @return True if the password matches, false otherwise.
    static bool verifyPassword(const std::string& password, const std::string& storedHash);

    // Computes the HMAC-SHA256 hash of a given data string using a secret key.
    // @param data The input string to hash.
    // @param key The secret key to use for HMAC.
    // @return The raw binary HMAC-SHA256 digest.
    // Throws std::runtime_error on failure.
    static std::string hmacSha256(const std::string& data, const std::string& key);

    // Base64 encodes a string.
    // @param data The string to encode.
    // @return The Base64 encoded string.
    static std::string base64Encode(const std::string& data);

    // Base64 decodes a string.
    // @param encoded_string The Base64 encoded string to decode.
    // @return The decoded string.
    static std::string base64Decode(const std::string& encoded_string);

private:
    // Private constructor to prevent instantiation.
    CryptoUtils() = delete;
};

#endif // CRYPTO_UTILS_HPP
```