```cpp
#ifndef DATAVIZ_CRYPTO_H
#define DATAVIZ_CRYPTO_H

#include <string>

// A utility class for cryptographic operations (hashing, potentially AES/RSA in future)
class Crypto {
public:
    // Hashes a password using SHA256 (for demonstration, use Argon2 or bcrypt in production)
    static std::string hashPassword(const std::string& password);

    // Verifies a password against a hash (for demonstration)
    static bool verifyPassword(const std::string& password, const std::string& hashedPassword);

    // Generates a SHA256 hash for any string
    static std::string sha256(const std::string& str);
};

#endif // DATAVIZ_CRYPTO_H
```