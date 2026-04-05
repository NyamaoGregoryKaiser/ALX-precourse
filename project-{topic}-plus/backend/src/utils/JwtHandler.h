```cpp
#ifndef JWT_HANDLER_H
#define JWT_HANDLER_H

#include <jwt-cpp/jwt.h>
#include <string>
#include <chrono>
#include <optional>
#include <drogon/drogon.h> // For LOG_ERROR
#include "AppErrors.h"
#include "config/ConfigLoader.h"

namespace TaskManager {

/**
 * @brief Struct to hold decoded JWT claims.
 */
struct JwtClaims {
    int userId;
    std::string role;
    std::string username;
};

/**
 * @brief Utility class for handling JSON Web Tokens (JWT).
 */
class JwtHandler {
public:
    /**
     * @brief Constructor. Initializes with the JWT secret from environment variables.
     * @throws std::runtime_error if JWT_SECRET is not set.
     */
    JwtHandler() {
        _jwtSecret = ConfigLoader::getRequiredEnv("JWT_SECRET");
        if (_jwtSecret.empty()) {
            throw std::runtime_error("JWT_SECRET environment variable is not set or is empty.");
        }
    }

    /**
     * @brief Creates a new JWT token.
     * @param userId The ID of the user.
     * @param role The role of the user (e.g., "user", "admin").
     * @param username The username.
     * @param expiresInSeconds The token expiry time in seconds (default 1 hour).
     * @return The signed JWT token string.
     */
    std::string createToken(int userId,
                            const std::string& role,
                            const std::string& username,
                            long expiresInSeconds = 3600) { // Default 1 hour
        auto now = std::chrono::system_clock::now();
        auto expiresAt = now + std::chrono::seconds(expiresInSeconds);

        return jwt::create()
            .set_issuer("task-manager-api")
            .set_type("JWT")
            .set_subject(std::to_string(userId))
            .set_issued_at(now)
            .set_expires_at(expiresAt)
            .set_payload_claim("userId", jwt::claim(std::to_string(userId)))
            .set_payload_claim("role", jwt::claim(role))
            .set_payload_claim("username", jwt::claim(username))
            .sign(jwt::algorithm::hs256{_jwtSecret});
    }

    /**
     * @brief Verifies a JWT token and extracts its claims.
     * @param token The JWT token string.
     * @return An optional JwtClaims struct if the token is valid, std::nullopt otherwise.
     */
    std::optional<JwtClaims> verifyToken(const std::string& token) {
        try {
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{_jwtSecret})
                .with_issuer("task-manager-api");

            auto decoded_token = verifier.verify(token);

            // Extract claims
            JwtClaims claims;
            claims.userId = std::stoi(decoded_token.get_payload_claim("userId").as_string());
            claims.role = decoded_token.get_payload_claim("role").as_string();
            claims.username = decoded_token.get_payload_claim("username").as_string();

            return claims;

        } catch (const jwt::error::token_verification_exception& e) {
            LOG_WARN << "JWT verification failed: " << e.what();
        } catch (const std::exception& e) {
            LOG_ERROR << "Error processing JWT: " << e.what();
        }
        return std::nullopt;
    }

private:
    std::string _jwtSecret;
};

} // namespace TaskManager

#endif // JWT_HANDLER_H
```