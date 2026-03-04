#pragma once

#include <string>
#include <chrono> // For token expiration
#include <nlohmann/json.hpp>

// This is a simplified JWT implementation.
// For production, consider a robust library like "jwt-cpp" or similar.
class JWT {
public:
    // Generates a JWT token for a given user ID and secret
    static std::string generateToken(const std::string& user_id, const std::string& secret, std::chrono::seconds expiry = std::chrono::hours(1));

    // Verifies a JWT token and returns the user ID if valid
    static std::string verifyToken(const std::string& token, const std::string& secret);

private:
    // Helper to encode/decode base64url
    static std::string base64UrlEncode(const std::string& input);
    static std::string base64UrlDecode(const std::string& input);

    // Helper for HMAC-SHA256 signature
    static std::string hmacSha256(const std::string& key, const std::string& msg);
};