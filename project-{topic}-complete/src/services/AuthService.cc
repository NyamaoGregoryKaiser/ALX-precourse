```cpp
#include "AuthService.h"
#include <drogon/drogon.h> // For LOG_ERROR
#include <json/json.h>
#include <fstream>
#include <chrono>

namespace CMS::Services {

AuthService::AuthService(drogon::orm::DbClientPtr dbClient)
    : dbClient_(std::move(dbClient)), userMapper_(dbClient_) {
    
    // Load JWT secret and expiration from config
    Json::Value appConfig = drogon::app().get){drogon::app().getJsonConfig();
    if (appConfig.isMember("jwt")) {
        jwtSecret_ = appConfig["jwt"]["secret"].asString();
        jwtExpirationSeconds_ = appConfig["jwt"]["expiration_seconds"].asInt();
    } else {
        LOG_WARN << "JWT configuration missing. Using default secret and expiration.";
        jwtSecret_ = "default_supersecret_jwt_key_for_ALX_CMS";
        jwtExpirationSeconds_ = 3600; // 1 hour
    }
}

drogon::orm::Future<std::tuple<std::string, CMS::Models::User>> AuthService::authenticate(const std::string& email, const std::string& password) {
    return userMapper_.findByEmail(email).then([=](const CMS::Models::User& user) {
        if (CMS::Models::UserMapper::verifyPassword(password, user.password_hash)) {
            std::string token = generateToken(user.id, user.role);
            return std::make_tuple(token, user);
        } else {
            LOG_WARN << "Authentication failed for user: " << email << " - Invalid password.";
            throw drogon::orm::UnexpectedRows("Invalid credentials", 0); // Or a custom AuthException
        }
    }).handleExcept([](const drogon::orm::DrogonDbException& e) {
        LOG_WARN << "Authentication failed for user (not found or DB error): " << e.what();
        throw drogon::orm::UnexpectedRows("Invalid credentials", 0); // Hide actual DB error from client
    });
}

std::string AuthService::generateToken(long long userId, const std::string& userRole) {
    auto token = jwt::create()
        .set_issuer("cms-drogon-app")
        .set_type("JWS")
        .set_subject(std::to_string(userId))
        .set_id(std::to_string(std::hash<long long>{}(userId) ^ std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now().time_since_epoch()).count())) // Unique ID
        .set_payload_claim("role", jwt::claim(userRole))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{jwtExpirationSeconds_})
        .sign(jwt::algorithm::hs256{jwtSecret_});
    return token;
}

std::optional<std::pair<long long, std::string>> AuthService::verifyToken(const std::string& token) {
    try {
        auto decoded_token = jwt::decode(token);
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwtSecret_})
            .with_issuer("cms-drogon-app");

        verifier.verify(decoded_token);

        long long userId = std::stoll(decoded_token.get_subject());
        std::string userRole = decoded_token.get_payload_claim("role").as_string();

        return std::make_pair(userId, userRole);
    } catch (const jwt::error::signature_verification_exception& e) {
        LOG_WARN << "JWT verification failed (signature): " << e.what();
    } catch (const jwt::error::token_verification_exception& e) {
        LOG_WARN << "JWT verification failed (token): " << e.what();
    } catch (const std::exception& e) {
        LOG_ERROR << "Unexpected error during JWT verification: " << e.what();
    }
    return std::nullopt;
}

bool AuthService::hasRole(const std::string& userRole, const std::string& requiredRole) {
    if (userRole == "admin") return true; // Admin can do anything
    return userRole == requiredRole;
}

bool AuthService::hasAnyRole(const std::string& userRole, const std::vector<std::string>& requiredRoles) {
    if (userRole == "admin") return true; // Admin can do anything
    for (const auto& role : requiredRoles) {
        if (userRole == role) return true;
    }
    return false;
}

} // namespace CMS::Services
```