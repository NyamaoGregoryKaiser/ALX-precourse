```cpp
#ifndef JWT_MANAGER_HPP
#define JWT_MANAGER_HPP

#include <string>
#include <utility> // For std::pair

class JwtManager {
public:
    // Constructor. Requires a secret key and token expiration duration in seconds.
    JwtManager(const std::string& secret, int expirationSeconds);

    // Creates a JWT token for the given user ID and role.
    std::string createToken(int userId, const std::string& role);

    // Verifies a JWT token. Returns true if valid, false otherwise.
    // If valid, extracts user_id and role into the provided references.
    bool verifyToken(const std::string& token, int& userId, std::string& role);

    // Overload for simple validity check without extracting claims.
    bool verifyToken(const std::string& token);

    // Extracts user ID and role from a *valid* token.
    // Should typically be called after `verifyToken` confirms validity.
    // Throws std::runtime_error if token format is invalid or claims are missing.
    std::pair<int, std::string> extractClaims(const std::string& token);

private:
    std::string secret; // The secret key used for signing JWTs
    int expirationSeconds; // How long the token is valid in seconds

    // Helper to perform base64url encoding
    std::string base64urlEncode(const std::string& data);
    // Helper to perform base64url decoding
    std::string base64urlDecode(const std::string& data);
};

#endif // JWT_MANAGER_HPP
```