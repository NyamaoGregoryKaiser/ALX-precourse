```cpp
#include "AuthService.h"

namespace TaskManager {
namespace Services {

AuthService::AuthService(UserService& user_service, Config::AppConfig& config)
    : user_service_(user_service), config_(config) {}

std::optional<AuthResult> AuthService::login(const std::string& username, const std::string& password) {
    if (user_service_.verifyUserPassword(username, password)) {
        std::optional<Models::User> user = user_service_.getUserByUsername(username);
        if (user) {
            nlohmann::json payload;
            payload["user_id"] = *user->id;
            payload["username"] = user->username;
            payload["role"] = Models::userRoleToString(user->role);

            long long jwt_expiration_seconds = config_.getLong("JWT_EXPIRATION_SECONDS", 3600);
            std::string jwt_secret = config_.get("JWT_SECRET");

            if (jwt_secret.empty() || jwt_secret == "super_secret_jwt_key_that_should_be_long_and_complex") {
                 Utils::Logger::getLogger()->warn("JWT_SECRET is not configured or is using default value. This is INSECURE for production.");
            }

            std::string token = Utils::JWTUtils::generateToken(payload, jwt_secret, jwt_expiration_seconds);
            
            Utils::Logger::getLogger()->info("User '{}' logged in successfully. Token generated.", username);
            return AuthResult{*user->id, user->username, Models::userRoleToString(user->role), token};
        }
    }
    Utils::Logger::getLogger()->warn("Failed login attempt for user: {}", username);
    return std::nullopt;
}

long long AuthService::authenticateToken(const std::string& token) {
    std::string jwt_secret = config_.get("JWT_SECRET");
    if (jwt_secret.empty() || jwt_secret == "super_secret_jwt_key_that_should_be_long_and_complex") {
        Utils::Logger::getLogger()->warn("JWT_SECRET is not configured or is using default value. This is INSECURE for production.");
    }

    std::optional<nlohmann::json> payload = Utils::JWTUtils::verifyToken(token, jwt_secret);

    if (!payload || !payload->count("user_id") || !payload->at("user_id").is_number()) {
        Utils::Logger::getLogger()->warn("Invalid or expired token received.");
        throw Exceptions::UnauthorizedException("Invalid or expired token.");
    }

    long long user_id = payload->at("user_id").get<long long>();
    // Optional: Re-verify user existence in DB for an extra layer of security,
    // though JWT itself usually covers this for session management.
    if (!user_service_.getUserById(user_id)) {
        Utils::Logger::getLogger()->warn("Token valid but user ID {} from token does not exist.", user_id);
        throw Exceptions::UnauthorizedException("User associated with token no longer exists.");
    }
    
    Utils::Logger::getLogger()->debug("Token authenticated for user ID: {}", user_id);
    return user_id;
}

} // namespace Services
} // namespace TaskManager
```