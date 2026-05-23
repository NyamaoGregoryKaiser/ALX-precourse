#ifndef JWT_UTILS_H
#define JWT_UTILS_H

#include <string>
#include <nlohmann/json.hpp>
#include <optional>
#include <chrono>

namespace JwtUtils {

    // Claims struct for convenience
    struct Claims {
        std::string user_id;
        std::string role;
        long exp; // Expiration time in seconds since epoch
        // Add other custom claims as needed
    };

    // Encode claims into a JWT token
    std::string encode(const Claims& claims, const std::string& secret);

    // Decode and validate a JWT token. Returns Claims if valid, nullopt otherwise.
    std::optional<Claims> decode(const std::string& token, const std::string& secret);

    // Helper to generate a new secret for development (DO NOT USE IN PROD)
    std::string generateRandomSecret(size_t length = 32);

} // namespace JwtUtils

#endif // JWT_UTILS_H