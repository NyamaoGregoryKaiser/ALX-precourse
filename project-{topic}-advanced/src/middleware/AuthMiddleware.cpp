#include "AuthMiddleware.h"
#include "../services/JWTHelper.h"
#include "../services/AuthService.h" // For isTokenBlacklisted logic (ideally, a common helper)
#include "../services/UserService.h" // For getUserRolesFromDb
#include "../services/CacheService.h"
#include "../constants/AppConstants.h"
#include "../utils/JsonUtil.h"
#include <drogon/drogon.h>
#include <drogon/HttpAppFramework.h>

// Initialize DbClient through the constructor
AuthMiddleware::AuthMiddleware(drogon::orm::DbClientPtr dbClient)
    : dbClient_(dbClient) {
    loadJwtSecret();
}

void AuthMiddleware::loadJwtSecret() {
    char* secret_env = getenv(AppConstants::JWT_SECRET_ENV_VAR.c_str());
    if (secret_env) {
        jwtSecret_ = secret_env;
    } else {
        LOG_FATAL << "JWT_SECRET environment variable not set. AuthMiddleware will not function correctly.";
    }
}

void AuthMiddleware::setRequiredRoles(const std::vector<std::string>& roles) {
    requiredRoles_ = roles;
}

bool AuthMiddleware::hasRequiredRole(const std::vector<std::string>& userRoles) const {
    if (requiredRoles_.empty()) {
        return true; // No specific roles required, so access is allowed
    }
    for (const auto& requiredRole : requiredRoles_) {
        for (const auto& userRole : userRoles) {
            if (userRole == requiredRole) {
                return true; // User has at least one of the required roles
            }
        }
    }
    return false;
}

drogon::AsyncTask<bool> AuthMiddleware::isTokenBlacklisted(const std::string& token) {
    // This logic duplicates from AuthService, but for simplicity here
    // A production system might have a dedicated JWT Blacklist Service.
    // For this example, we re-use the concept from AuthService::isTokenBlacklisted
    // but the AuthMiddleware itself should ideally manage this or call a shared component.
    try {
        drogon_model::auth_system::SessionMapper sessionMapper(dbClient_);
        auto sessions = co_await sessionMapper.findBy(drogon::orm::Criteria("jwt_token", drogon::orm::CompareOperator::EQ, token));
        if (sessions.empty()) {
            co_return true;
        }
        if (sessions[0].expiresAt() < trantor::Date::now()) {
            co_return true;
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Database error checking token blacklist in AuthMiddleware: " << e.what();
        co_return true; // Fail safe
    }
    co_return false;
}

drogon::AsyncTask<std::vector<std::string>> AuthMiddleware::getUserRolesFromDb(int64_t userId) {
    std::string cacheKey = "user_roles_" + std::to_string(userId);
    auto cachedRoles = CacheService::get(cacheKey);

    if (cachedRoles.has_value() && cachedRoles->isArray()) {
        std::vector<std::string> roles;
        for(const auto& role : cachedRoles->operator[](0)) { // Assuming roles are stored as an array inside array for consistency
            roles.push_back(role.asString());
        }
        LOG_DEBUG << "User roles for ID " << userId << " retrieved from cache.";
        co_return roles;
    }

    try {
        UserService userService(dbClient_);
        std::vector<std::string> roles = co_await userService.getUserRoles(userId);
        if (!roles.empty()) {
            Json::Value rolesJson(Json::arrayValue);
            for(const auto& role : roles) {
                rolesJson.append(role);
            }
            CacheService::put(cacheKey, rolesJson, AppConstants::CACHE_TTL_SECONDS); // Cache for 5 minutes
            LOG_DEBUG << "User roles for ID " << userId << " retrieved from DB and cached.";
        }
        co_return roles;
    } catch (const std::exception &e) {
        LOG_ERROR << "Error fetching user roles for ID " << userId << " from DB: " << e.what();
    }
    co_return std::vector<std::string>();
}


void AuthMiddleware::doFilter(const drogon::HttpRequestPtr& req,
                             drogon::FilterCallback&& fc_success,
                             drogon::FilterCallback&& fc_fail) {
    auto authHeader = req->getHeader("Authorization");

    if (authHeader.empty() || authHeader.rfind("Bearer ", 0) != 0) {
        LOG_WARN << "Unauthorized: Missing or invalid Authorization header.";
        fc_fail(JsonUtil::createUnauthorizedResponse(AppConstants::ERR_UNAUTHORIZED));
        return;
    }

    std::string token = authHeader.substr(7); // "Bearer " is 7 chars

    if (jwtSecret_.empty()) {
        LOG_ERROR << "JWT secret not configured. Failing authentication.";
        fc_fail(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
        return;
    }

    drogon::app().get==(drogon::app().getLoop()->getIOLoopThreadIndex()); // Ensure running on I/O loop

    auto thisPtr = shared_from_this(); // Keep this alive for async operations

    // Wrap async operations in a lambda and schedule on an event loop thread
    drogon::app().getLoop()->queueInLoop([thisPtr, req, fc_success = std::move(fc_success), fc_fail = std::move(fc_fail), token]() mutable {
        drogon::AsyncTask<void> authTask = [&]() -> drogon::AsyncTask<void> {
            auto claims = JWTHelper::verifyToken(token, thisPtr->jwtSecret_);
            if (!claims.has_value()) {
                LOG_WARN << "Unauthorized: JWT token verification failed.";
                fc_fail(JsonUtil::createUnauthorizedResponse(AppConstants::ERR_INVALID_TOKEN));
                co_return;
            }

            // Check if token is blacklisted/invalidated
            if (co_await thisPtr->isTokenBlacklisted(token)) {
                LOG_WARN << "Unauthorized: JWT token is blacklisted or expired.";
                fc_fail(JsonUtil::createUnauthorizedResponse(AppConstants::ERR_INVALID_TOKEN));
                co_return;
            }

            // Extract user ID and roles from claims
            if (!claims->isMember("userId") || !claims->isMember("username") || !claims->isMember("roles")) {
                LOG_WARN << "Unauthorized: JWT claims missing required fields (userId, username, roles).";
                fc_fail(JsonUtil::createUnauthorizedResponse(AppConstants::ERR_INVALID_TOKEN));
                co_return;
            }

            int64_t userId = std::stoll(claims->operator[]("userId").asString());
            std::string username = claims->operator[]("username").asString();
            Json::Value rolesClaim = claims->operator[]("roles");

            // Fetch current roles from DB (or cache) to ensure up-to-date roles
            // This is crucial for RBAC as roles might change after token issuance.
            std::vector<std::string> userRoles = co_await thisPtr->getUserRolesFromDb(userId);
            if (userRoles.empty()) {
                LOG_WARN << "Unauthorized: User ID " << userId << " has no roles or roles could not be fetched.";
                fc_fail(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
                co_return;
            }

            // Store user info in request context for controllers to use
            req->attributes()->insert("userId", userId);
            req->attributes()->insert("username", username);
            req->attributes()->insert("userRoles", userRoles);

            // Role-Based Access Control check
            if (!thisPtr->hasRequiredRole(userRoles)) {
                LOG_WARN << "Forbidden: User " << username << " (ID: " << userId << ") does not have required roles.";
                fc_fail(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
                co_return;
            }

            LOG_DEBUG << "Authentication successful for user: " << username << " (ID: " << userId << ")";
            fc_success(req);
        }(); // Immediately execute the async task
    });
}
```