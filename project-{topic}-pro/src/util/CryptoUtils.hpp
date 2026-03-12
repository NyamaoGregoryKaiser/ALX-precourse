```cpp
#ifndef PAYMENT_PROCESSOR_CRYPT_UTILS_HPP
#define PAYMENT_PROCESSOR_CRYPT_UTILS_HPP

#include <string>
#include <vector>

// Forward declaration for JWT token details
struct JwtTokenDetails {
    long userId;
    std::string username;
    std::string role; // UserRole as string
    long expiryTime; // Unix timestamp
};

class CryptoUtils {
public:
    // Password hashing (e.g., using Argon2, bcrypt - conceptual, using placeholder for brevity)
    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& hashedPassword);

    // JWT generation and verification (conceptual using a library like jwt-cpp or manual for brevity)
    static std::string generateJwtToken(long userId, const std::string& username, UserRole role, long expiryMinutes);
    static std::optional<JwtTokenDetails> verifyJwtToken(const std::string& token);

    // Simple UUID generation (for transaction IDs, etc.)
    static std::string generateUuid();

private:
    static std::string jwtSecret; // Loaded from Config
};

#endif // PAYMENT_PROCESSOR_CRYPT_UTILS_HPP
```