#pragma once

#include <string>
#include <chrono>
#include <jwt-cpp/jwt.h>

class JwtManager {
public:
    JwtManager(const std::string& secret, long expiration_seconds);

    // Generate a JWT token for a user
    std::string generateToken(const std::string& user_id, const std::string& username, const std::string& email);

    // Verify and decode a JWT token
    jwt::decoded_token verifyToken(const std::string& token_string);

    // Get the configured secret (useful for testing or debugging, be careful in production)
    const std::string& getSecret() const { return secret_; }

private:
    std::string secret_;
    long expiration_seconds_;
    jwt::verifier<jwt::default_clock, jwt::traits::nlohmann_json> verifier_;
};
```