#include "JwtManager.h"
#include "AppConfig.h"
#include <jwt-cpp/jwt.h>
#include <spdlog/spdlog.h>
#include <stdexcept>

JwtManager& JwtManager::getInstance() {
    static JwtManager instance;
    return instance;
}

JwtManager::JwtManager() {
    const auto& config = AppConfig::getInstance();
    jwtSecret_ = config.getString("jwt_secret");
    jwtExpirationSeconds_ = config.getInt("jwt_expiration_seconds", 3600);

    if (jwtSecret_.empty() || jwtSecret_ == "your_super_secret_jwt_key_that_should_be_long_and_complex") {
        spdlog::warn("JWT secret is not configured or uses default. This is INSECURE for production!");
        // For production, you might want to throw an exception or exit here.
    }
}

std::string JwtManager::generateToken(long long userId, const std::string& username, const std::string& role) {
    try {
        auto token = jwt::create()
            .set_issuer("mobile_backend")
            .set_type("JWT")
            .set_id(std::to_string(userId)) // Subject: user ID
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds(jwtExpirationSeconds_))
            .set_payload_claim("userId", jwt::claim(std::to_string(userId)))
            .set_payload_claim("username", jwt::claim(username))
            .set_payload_claim("role", jwt::claim(role))
            .sign(jwt::algorithm::hs256{jwtSecret_});
        return token;
    } catch (const std::exception& e) {
        spdlog::error("Error generating JWT token for user {}: {}", userId, e.what());
        throw std::runtime_error("Failed to generate JWT token.");
    }
}

std::optional<Json::Value> JwtManager::verifyToken(const std::string& token) {
    try {
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwtSecret_})
            .with_issuer("mobile_backend");

        auto decoded_token = jwt::decode(token);
        verifier.verify(decoded_token);

        Json::Value claims;
        for (auto const& [key, value] : decoded_token.get_payload_claims()) {
            if (value.is_string()) {
                claims[key] = value.as_string();
            } else if (value.is_integer()) {
                claims[key] = value.as_int();
            } else if (value.is_boolean()) {
                claims[key] = value.as_bool();
            }
            // Add more types as needed
        }
        return claims;

    } catch (const jwt::verification_error& e) {
        spdlog::warn("JWT verification failed: {}. Token: {}", e.what(), token.substr(0, 50) + "...");
    } catch (const std::exception& e) {
        spdlog::error("Error verifying JWT token: {}. Token: {}", e.what(), token.substr(0, 50) + "...");
    }
    return std::nullopt;
}