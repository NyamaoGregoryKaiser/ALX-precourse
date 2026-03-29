```cpp
#include "JWTManager.hpp"
#include <chrono>

JWTManager::JWTManager(const std::string& secret, int expiry_minutes)
    : secret_(secret), expiry_minutes_(expiry_minutes) {
    if (secret_.empty()) {
        Logger::log(LogLevel::CRITICAL, "JWT secret cannot be empty!");
        throw std::runtime_error("JWT secret is empty.");
    }
    Logger::log(LogLevel::INFO, "JWTManager initialized with expiry of " + std::to_string(expiry_minutes_) + " minutes.");
}

std::string JWTManager::generateToken(int user_id, const std::string& username, const std::string& role_str) {
    auto now = std::chrono::system_clock::now();
    auto expires_at = now + std::chrono::minutes(expiry_minutes_);

    std::string token = jwt::create()
        .set_issuer("alx-project-api")
        .set_type("JWT")
        .set_id(std::to_string(user_id)) // JWT ID claim, using user ID
        .set_subject(username)
        .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
        .set_payload_claim("username", jwt::claim(username))
        .set_payload_claim("role", jwt::claim(role_str))
        .set_issued_at(now)
        .set_expires_at(expires_at)
        .sign(jwt::algorithm::hs256{secret_});

    Logger::log(LogLevel::DEBUG, "Generated JWT for user ID: " + std::to_string(user_id) + ", username: " + username);
    return token;
}

std::optional<DecodedToken> JWTManager::verifyToken(const std::string& token) {
    try {
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{secret_})
            .with_issuer("alx-project-api");

        auto decoded_token = verifier.verify(token);

        DecodedToken dt;
        dt.user_id = std::stoi(decoded_token.get_payload_claim("user_id").as_string());
        dt.username = decoded_token.get_payload_claim("username").as_string();
        dt.role = stringToUserRole(decoded_token.get_payload_claim("role").as_string());
        dt.expires_at = decoded_token.get_expires_at().time_since_epoch().count();

        Logger::log(LogLevel::DEBUG, "Token verified successfully for user ID: " + std::to_string(dt.user_id));
        return dt;
    } catch (const jwt::error::token_verification_exception& e) {
        Logger::log(LogLevel::WARNING, "JWT verification failed: " + std::string(e.what()));
        return std::nullopt;
    } catch (const std::exception& e) {
        Logger::log(LogLevel::ERROR, "Error verifying JWT: " + std::string(e.what()));
        return std::nullopt;
    }
}

UserRole JWTManager::stringToUserRole(const std::string& role_str) {
    if (role_str == "ADMIN") {
        return UserRole::ADMIN;
    }
    return UserRole::USER;
}
```