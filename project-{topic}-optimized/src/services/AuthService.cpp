```cpp
#include "AuthService.h"
#include <bcrypt.h> // For password hashing
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

// Dummy for bcrypt headers if not installed globally
#ifndef BCRYPT_API
#define BCRYPT_API
extern "C" {
    BCRYPT_API int bcrypt_hashpw(const char* password, const char* salt, char* hashbuf, size_t hashbuf_len);
    BCRYPT_API int bcrypt_gensalt(int factor, char* saltbuf);
    BCRYPT_API int bcrypt_checkpw(const char* password, const char* hash, const char* comparebuf);
}
#endif

AuthService::AuthService(drogon::orm::DbClientPtr dbClient) : dbClient_(dbClient) {
    // Retrieve JWT secret from app config.
    // If not set via env var, it will be null or empty.
    const Json::Value &filterConfig = drogon::app().get >("filters")["AuthFilter"];
    if (filterConfig.isMember("jwt_secret") && filterConfig["jwt_secret"].isString()) {
        jwtSecret_ = filterConfig["jwt_secret"].asString();
    } else {
        LOG_WARN << "JWT_SECRET not found in config.json or environment. Using a default (NOT SECURE FOR PRODUCTION).";
        jwtSecret_ = "super_secret_jwt_key_please_change_me_in_production_from_env"; // Fallback, DO NOT USE IN PRODUCTION
    }
}

std::string AuthService::hashPassword(const std::string& password) {
    char salt[BCRYPT_SALTSZ];
    bcrypt_gensalt(12, salt); // Factor 12 is a good balance
    char hash[BCRYPT_HASH_LEN];
    bcrypt_hashpw(password.c_str(), salt, hash, sizeof(hash));
    return std::string(hash);
}

bool AuthService::verifyPassword(const std::string& password, const std::string& hashedPassword) {
    char comparebuf[BCRYPT_HASH_LEN];
    return bcrypt_checkpw(password.c_str(), hashedPassword.c_str(), comparebuf) == 0;
}

std::string AuthService::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&now_c), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

drogon::Task<std::pair<User, std::string>> AuthService::registerUser(const std::string& username, const std::string& email, const std::string& password) {
    drogon::orm::Mapper<User> mapper(dbClient_);
    
    // Check if user already exists
    auto existing_user = co_await findUserByEmail(email);
    if (existing_user.has_value()) {
        throw drogon::HttpException("User with this email already exists", drogon::k409Conflict);
    }

    User newUser;
    newUser.username = username;
    newUser.email = email;
    newUser.password_hash = hashPassword(password);
    newUser.created_at = getCurrentTimestamp();

    try {
        // Insert user into DB
        // Drogon ORM's insert method returns the inserted model with updated ID.
        auto insertedUser = co_await dbClient_->execSqlCoro(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?) RETURNING id;",
            username, email, newUser.password_hash, newUser.created_at
        );
        
        newUser.id = insertedUser[0]["id"].as<int>();

        // Generate JWT token
        std::string token = generateToken(newUser.id);
        co_return std::make_pair(newUser, token);

    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error during user registration: " << e.what();
        throw drogon::HttpException("Failed to register user due to database error", drogon::k500InternalServerError);
    }
}

drogon::Task<std::optional<std::string>> AuthService::loginUser(const std::string& email, const std::string& password) {
    drogon::orm::Mapper<User> mapper(dbClient_);

    auto userOpt = co_await findUserByEmail(email);
    if (!userOpt.has_value()) {
        co_return std::nullopt; // User not found
    }

    User user = userOpt.value();
    if (verifyPassword(password, user.password_hash)) {
        co_return generateToken(user.id);
    } else {
        co_return std::nullopt; // Invalid password
    }
}

drogon::Task<std::optional<User>> AuthService::findUserByEmail(const std::string& email) {
    try {
        auto result = co_await dbClient_->execSqlCoro("SELECT * FROM users WHERE email = ?;", email);
        if (result.empty()) {
            co_return std::nullopt;
        }
        co_return User::fromDbResult(result, 0);
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error finding user by email: " << e.what();
        co_return std::nullopt; // Or rethrow, depending on error handling strategy
    }
}

drogon::Task<std::optional<User>> AuthService::findUserById(int user_id) {
    try {
        auto result = co_await dbClient_->execSqlCoro("SELECT * FROM users WHERE id = ?;", user_id);
        if (result.empty()) {
            co_return std::nullopt;
        }
        co_return User::fromDbResult(result, 0);
    } catch (const drogon::orm::DrogonDbException& e) {
        LOG_ERROR << "Database error finding user by ID: " << e.what();
        co_return std::nullopt;
    }
}


std::string AuthService::generateToken(int user_id) {
    auto token = jwt::create()
        .set_issuer("task-management-system")
        .set_type("JWT")
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours{24}) // Token expires in 24 hours
        .set_payload_claim("user_id", jwt::claim(std::to_string(user_id)))
        .sign(jwt::algorithm::hs256{jwtSecret_});
    return token;
}

std::optional<int> AuthService::verifyToken(const std::string& token) {
    try {
        auto decoded_token = jwt::decode(token);
        jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwtSecret_})
            .with_issuer("task-management-system")
            .verify(decoded_token);

        if (decoded_token.has_payload_claim("user_id")) {
            return std::stoi(decoded_token.get_payload_claim("user_id").as_string());
        }
    } catch (const jwt::error::signature_verification_exception& e) {
        LOG_WARN << "JWT Signature verification failed: " << e.what();
    } catch (const jwt::error::token_verification_exception& e) {
        LOG_WARN << "JWT Token verification failed: " << e.what();
    } catch (const std::exception& e) {
        LOG_WARN << "Error verifying JWT token: " << e.what();
    }
    return std::nullopt;
}
```