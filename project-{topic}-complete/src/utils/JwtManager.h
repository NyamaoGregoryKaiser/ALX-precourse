```cpp
#pragma once

#include <string>
#include <optional>
#include <jwt-cpp/jwt.h>

namespace JwtManager {
    extern std::string s_jwt_secret;
    extern int s_jwt_expiration_seconds;
    extern jwt::verifier<jwt::default_clock, jwt::default_claim_provider> s_verifier;

    void init(const std::string& secret, int expiration_seconds);
    std::string generateToken(long user_id, const std::string& username);
    jwt::decode verifyToken(const std::string& token); // Throws on failure
    
    std::optional<long> getUserIdFromToken(const std::string& token);
    std::optional<std::string> getUsernameFromToken(const std::string& token);

    // Custom exception for JWT errors
    class JwtException : public std::runtime_error {
    public:
        explicit JwtException(const std::string& message)
            : std::runtime_error("JWT Error: " + message) {}
    };
}
```