#include "AuthService.h"
#include "PasswordHasher.h"
#include "JWTHelper.h"
#include "../models/User.h"
#include "../models/Role.h"
#include "../models/Session.h"
#include "../constants/AppConstants.h"
#include "../utils/StringUtil.h"
#include <drogon/orm/Exception.h>
#include <drogon/drogon.h> // For LOG_INFO, LOG_ERROR, and getenv

using namespace drogon_model::auth_system;

AuthService::AuthService(drogon::orm::DbClientPtr dbClient)
    : dbClient_(dbClient) {
    loadJwtSecret();
}

void AuthService::loadJwtSecret() {
    char* secret_env = getenv(AppConstants::JWT_SECRET_ENV_VAR.c_str());
    if (secret_env) {
        jwtSecret_ = secret_env;
        LOG_INFO << "JWT Secret loaded from environment variable.";
    } else {
        LOG_FATAL << "JWT_SECRET environment variable not set. JWT operations will fail.";
        // In production, this should cause the application to exit or log a critical error.
    }
}

drogon::AsyncTask<std::optional<Json::Value>> AuthService::registerUser(
    const std::string& username,
    const std::string& email,
    const std::string& password
) {
    if (jwtSecret_.empty()) {
        co_return std::nullopt; // Cannot proceed without secret
    }

    try {
        UserMapper userMapper(dbClient_);

        // Check if user already exists by username or email
        auto existingUsers = co_await userMapper.findBy(drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, StringUtil::trim(username)) ||
                                                        drogon::orm::Criteria("email", drogon::orm::CompareOperator::EQ, StringUtil::trim(email)));

        if (!existingUsers.empty()) {
            LOG_WARN << "Registration failed: User with username '" << username << "' or email '" << email << "' already exists.";
            co_return std::nullopt; // Indicate user already exists
        }

        std::string hashedPassword = PasswordHasher::hashPassword(password);
        if (hashedPassword.empty()) {
            LOG_ERROR << "Failed to hash password for new user '" << username << "'.";
            co_return std::nullopt;
        }

        User newUser;
        newUser.setUsername(StringUtil::trim(username));
        newUser.setEmail(StringUtil::trim(email));
        newUser.setPasswordHash(hashedPassword);
        newUser.setCreatedAt(trantor::Date::now());
        newUser.setUpdatedAt(trantor::Date::now());
        newUser.setEnabled(true); // New users are enabled by default

        User savedUser = co_await userMapper.insert(newUser);

        // Assign default 'user' role
        RoleMapper roleMapper(dbClient_);
        auto defaultRoles = co_await roleMapper.findBy(drogon::orm::Criteria("name", drogon::orm::CompareOperator::EQ, AppConstants::ROLE_USER));
        if (!defaultRoles.empty()) {
            auto defaultRoleId = defaultRoles[0].id();
            co_await dbClient_->execSqlCoro("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
                                        savedUser.id(), defaultRoleId);
            LOG_INFO << "Assigned default '" << AppConstants::ROLE_USER << "' role to user " << savedUser.username();
        } else {
            LOG_WARN << "Default role '" << AppConstants::ROLE_USER << "' not found. User registered without default role.";
        }


        LOG_INFO << "User registered successfully: " << savedUser.username();
        co_return savedUser.toJson();

    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error during user registration: " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error during user registration: " << e.what();
    }
    co_return std::nullopt;
}

drogon::AsyncTask<std::optional<Json::Value>> AuthService::loginUser(
    const std::string& identifier,
    const std::string& password
) {
    if (jwtSecret_.empty()) {
        co_return std::nullopt;
    }

    try {
        UserMapper userMapper(dbClient_);
        std::string trimmedIdentifier = StringUtil::trim(identifier);

        // Find user by username or email
        auto users = co_await userMapper.findBy(drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, trimmedIdentifier) ||
                                                drogon::orm::Criteria("email", drogon::orm::CompareOperator::EQ, trimmedIdentifier));

        if (users.empty()) {
            LOG_WARN << "Login failed for identifier '" << identifier << "': User not found.";
            co_return std::nullopt; // User not found
        }
        User user = users[0]; // Assuming identifier is unique

        if (!user.enabled()) {
            LOG_WARN << "Login failed for user '" << user.username() << "': Account disabled.";
            co_return std::nullopt; // Account disabled
        }

        if (!PasswordHasher::verifyPassword(password, user.passwordHash())) {
            LOG_WARN << "Login failed for user '" << user.username() << "': Invalid password.";
            co_return std::nullopt; // Invalid password
        }

        // Fetch user roles
        std::vector<drogon_model::auth_system::Role> roles = user.getRoles(dbClient_);
        std::vector<std::string> roleNames;
        for (const auto& role : roles) {
            roleNames.push_back(role.name());
        }

        // Generate JWT token
        std::string token = JWTHelper::generateToken(
            user.id(),
            user.username(),
            roleNames,
            jwtSecret_,
            AppConstants::JWT_EXPIRATION_SECONDS
        );

        if (token.empty()) {
            LOG_ERROR << "Failed to generate JWT token for user: " << user.username();
            co_return std::nullopt;
        }

        // Store session for invalidation purposes (e.g., logout, revocation)
        SessionMapper sessionMapper(dbClient_);
        Session newSession;
        newSession.setJwtToken(token);
        newSession.setUserId(user.id());
        newSession.setExpiresAt(trantor::Date::dateAfter(AppConstants::JWT_EXPIRATION_SECONDS));
        newSession.setCreatedAt(trantor::Date::now());
        co_await sessionMapper.insert(newSession);

        Json::Value result;
        result["user"] = user.toJson();
        result["token"] = token;
        Json::Value rolesJson(Json::arrayValue);
        for(const auto& roleName : roleNames) {
            rolesJson.append(roleName);
        }
        result["roles"] = rolesJson;

        LOG_INFO << "User '" << user.username() << "' logged in successfully.";
        co_return result;

    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error during user login: " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error during user login: " << e.what();
    }
    co_return std::nullopt;
}

drogon::AsyncTask<bool> AuthService::logoutUser(const std::string& token) {
    if (token.empty()) {
        co_return false;
    }
    try {
        SessionMapper sessionMapper(dbClient_);
        // Mark the token as expired/invalidated in the sessions table
        // This is a simple blacklist-like mechanism for stateless JWTs
        size_t deletedRows = co_await sessionMapper.deleteBy(drogon::orm::Criteria("jwt_token", drogon::orm::CompareOperator::EQ, token));
        if (deletedRows > 0) {
            LOG_INFO << "JWT token successfully invalidated/blacklisted.";
            co_return true;
        } else {
            LOG_WARN << "Attempted to logout with a token that was not found or already invalidated.";
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error during logout: " << e.what();
    } catch (const std::exception &e) {
        LOG_ERROR << "General error during logout: " << e.what();
    }
    co_return false;
}

drogon::AsyncTask<bool> AuthService::isTokenBlacklisted(const std::string& token) {
    if (token.empty()) {
        co_return true; // Empty token is considered invalid
    }
    try {
        SessionMapper sessionMapper(dbClient_);
        // Check if token exists in the sessions table (meaning it's active)
        // Or if it's on a blacklist (for revocation).
        // For simplicity, we assume if it's NOT in `sessions` table, it's blacklisted/expired.
        // A more robust system would have a dedicated blacklist table or distributed cache.
        auto sessions = co_await sessionMapper.findBy(drogon::orm::Criteria("jwt_token", drogon::orm::CompareOperator::EQ, token));
        if (sessions.empty()) {
            LOG_DEBUG << "Token not found in active sessions, considering it blacklisted/expired.";
            co_return true; // Token is not active, thus blacklisted or already expired
        }
        // Also check if it's expired by time (though JWT itself handles this)
        if (sessions[0].expiresAt() < trantor::Date::now()) {
            LOG_DEBUG << "Token found but expired in DB, considering it blacklisted/expired.";
            // Optionally, delete expired session from DB here
            co_await sessionMapper.deleteBy(drogon::orm::Criteria("jwt_token", drogon::orm::CompareOperator::EQ, token));
            co_return true;
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error checking token blacklist: " << e.what();
        co_return true; // Treat database errors as token being invalid for safety
    } catch (const std::exception &e) {
        LOG_ERROR << "General error checking token blacklist: " << e.what();
        co_return true;
    }
    co_return false; // Token is found and not expired, so it's not blacklisted
}

```