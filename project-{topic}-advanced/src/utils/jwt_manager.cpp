```cpp
#include "jwt_manager.h"
#include <chrono>

namespace mobile_backend {
namespace utils {

JwtManager::JwtManager(const std::string& secret) : secret_key(secret) {
    if (secret_key.empty()) {
        LOG_CRITICAL("JWT_SECRET environment variable is not set or is empty. Authentication will fail!");
    } else if (secret_key.length() < 32) { // Common recommendation for HS256
        LOG_WARN("JWT_SECRET is less than 32 characters. Consider a stronger secret for production.");
    }
}

std::string JwtManager::create_token(int user_id, const std::string& username) const {
    if (secret_key.empty()) {
        LOG_ERROR("Cannot create JWT: secret key is empty.");
        return "";
    }

    try {
        auto token = jwt::create()
            .set_issuer("mobile-backend-service")
            .set_type("JWT")
            .set_subject(std::to_string(user_id))
            .set_payload_claim("username", jwt::claim(username))
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours{24}) // Token valid for 24 hours
            .sign(jwt::algorithm::hs256{secret_key});
        
        LOG_DEBUG("Successfully created JWT for user_id: {}", user_id);
        return token;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to create JWT for user_id {}. Error: {}", user_id, e.what());
        return "";
    }
}

std::optional<int> JwtManager::verify_token(const std::string& token) const {
    if (secret_key.empty()) {
        LOG_ERROR("Cannot verify JWT: secret key is empty.");
        return std::nullopt;
    }

    try {
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{secret_key})
            .with_issuer("mobile-backend-service");

        auto decoded_token = jwt::decode(token);
        verifier.verify(decoded_token);

        auto sub_claim = decoded_token.get_subject();
        if (sub_claim.empty()) {
            LOG_WARN("JWT token has no subject (user ID).");
            return std::nullopt;
        }

        int user_id = std::stoi(sub_claim);
        LOG_DEBUG("Successfully verified JWT for user_id: {}", user_id);
        return user_id;

    } catch (const jwt::verification_error& e) {
        LOG_WARN("JWT verification failed: {}", e.what());
    } catch (const jwt::error::token_parse_error& e) {
        LOG_WARN("JWT parsing failed: {}", e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("An unexpected error occurred during JWT verification: {}", e.what());
    }
    return std::nullopt;
}

} // namespace utils
} // namespace mobile_backend
```