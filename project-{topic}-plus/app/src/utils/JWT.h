#ifndef JWT_H
#define JWT_H

#include <string>
#include <chrono>
#include <jwt-cpp/jwt.h>
#include "Logger.h"
#include "../app_config.h"
#include "ErrorHandler.h" // For UnauthorizedException

namespace JWT {

    struct TokenClaims {
        long long user_id;
        std::string username;
        std::string role;
    };

    /**
     * @brief Generates a JWT token.
     * @param user_id The ID of the user.
     * @param username The username.
     * @param role The role of the user (e.g., "USER", "ADMIN").
     * @param expiresIn Optional expiration duration. Defaults to AppConfig::JWT_EXPIRATION_SECONDS.
     * @return The signed JWT string.
     */
    std::string generateToken(long long user_id, const std::string& username, const std::string& role,
                              std::chrono::seconds expiresIn = AppConfig::JWT_EXPIRATION_SECONDS) {
        try {
            auto token = jwt::create()
                .set_issuer(AppConfig::APP_NAME)
                .set_type("JWT")
                .set_subject(std::to_string(user_id))
                .set_id(std::to_string(std::hash<std::string>{}(username + std::to_string(user_id)))) // Unique token ID
                .set_issued_at(std::chrono::system_clock::now())
                .set_expires_at(std::chrono::system_clock::now() + expiresIn)
                .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
                .set_payload_claim("username", jwt::claim(username))
                .set_payload_claim("role", jwt::claim(role))
                .sign(jwt::algorithm::hs256{AppConfig::JWT_SECRET_KEY});

            LOG_DEBUG("Generated JWT for user_id: {}, username: {}, role: {}", user_id, username, role);
            return token;
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to generate JWT token: {}", e.what());
            throw InternalServerException("Failed to generate authentication token.");
        }
    }

    /**
     * @brief Verifies a JWT token and extracts its claims.
     * @param token The JWT string to verify.
     * @return TokenClaims struct containing user_id, username, and role.
     * @throws UnauthorizedException if the token is invalid or expired.
     */
    TokenClaims verifyToken(const std::string& token) {
        try {
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{AppConfig::JWT_SECRET_KEY})
                .with_issuer(AppConfig::APP_NAME);

            auto decoded_token = jwt::decode(token);
            verifier.verify(decoded_token);

            // Extract claims
            TokenClaims claims;
            claims.user_id = std::stoll(decoded_token.get_payload_claim("user_id").as_string());
            claims.username = decoded_token.get_payload_claim("username").as_string();
            claims.role = decoded_token.get_payload_claim("role").as_string();

            LOG_DEBUG("Verified JWT for user_id: {}, username: {}, role: {}", claims.user_id, claims.username, claims.role);
            return claims;
        } catch (const jwt::verification_error& e) {
            LOG_WARN("JWT verification failed: {}", e.what());
            throw UnauthorizedException("Invalid or expired authentication token.");
        } catch (const jwt::decode_error& e) {
            LOG_WARN("JWT decode failed: {}", e.what());
            throw UnauthorizedException("Malformed authentication token.");
        } catch (const std::exception& e) {
            LOG_ERROR("Unexpected error during JWT verification: {}", e.what());
            throw InternalServerException("Authentication token processing error.");
        }
    }

} // namespace JWT

#endif // JWT_H