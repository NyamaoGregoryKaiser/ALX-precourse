#pragma once

#include <string>
#include <chrono>
#include <optional>
#include <json/json.h> // For Json::Value (claims representation)

// Forward declare for pimpl or to reduce dependencies here
namespace jwt {
    class decoded_jwt;
}

class JwtManager {
public:
    static JwtManager& getInstance();

    // Generates a JWT token for a given user ID and role
    std::string generateToken(long long userId, const std::string& username, const std::string& role);

    // Verifies a JWT token and returns claims if valid
    std::optional<Json::Value> verifyToken(const std::string& token);

    // Delete copy constructor and assignment operator for singleton
    JwtManager(const JwtManager&) = delete;
    JwtManager& operator=(const JwtManager&) = delete;

private:
    JwtManager(); // Private constructor for singleton
    std::string jwtSecret_;
    int jwtExpirationSeconds_;
};