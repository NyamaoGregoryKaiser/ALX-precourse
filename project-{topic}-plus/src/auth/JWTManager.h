#pragma once

#include <string>
#include <vector>
#include <optional>
#include <jwt-cpp/jwt.h> // From jwt-cpp library
#include <chrono> // For JWT expiry

namespace tm_api {
namespace auth {

struct JWTPayload {
    std::string userId;
    std::string username;
    std::string role;
    // Add any other claims you need
};

class JWTManager {
public:
    JWTManager(const std::string& secret, int expiryMinutes);

    std::string generateToken(const JWTPayload& payload) const;
    std::optional<JWTPayload> verifyToken(const std::string& token) const;

private:
    std::string secret;
    int expiryMinutes; // Token expiry duration in minutes
    jwt::verifier<jwt::default_clock, jwt::default_clock> verifier;
};

} // namespace auth
} // namespace tm_api