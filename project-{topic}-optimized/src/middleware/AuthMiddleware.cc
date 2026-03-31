#include "AuthMiddleware.h"
#include "utils/JwtManager.h"
#include <drogon/drogon.h>
#include <spdlog/spdlog.h>

void AuthMiddleware::doFilter(const drogon::HttpRequestPtr &req,
                              drogon::FilterCallback &&fcb,
                              drogon::FilterChainCallback &&fccb) {
    // Check for Authorization header
    std::string authHeader = req->getHeader("Authorization");
    if (authHeader.empty() || authHeader.rfind("Bearer ", 0) != 0) { // Check for "Bearer " prefix
        spdlog::warn("AuthMiddleware: No or invalid Authorization header found for path: {}", req->path());
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("{\"code\":401,\"message\":\"Unauthorized: Missing or invalid token\"}");
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        fcb(resp);
        return;
    }

    // Extract token
    std::string token = authHeader.substr(7); // "Bearer ".length() == 7

    // Verify token
    auto claims = JwtManager::getInstance().verifyToken(token);
    if (!claims) {
        spdlog::warn("AuthMiddleware: JWT verification failed for path: {}", req->path());
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("{\"code\":401,\"message\":\"Unauthorized: Invalid or expired token\"}");
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        fcb(resp);
        return;
    }

    // Token is valid, store user info in request context
    UserInfo userInfo;
    userInfo.isAuthenticated = true;
    userInfo.userId = std::stoll(claims.value()["userId"].asString());
    userInfo.username = claims.value()["username"].asString();
    userInfo.role = claims.value()["role"].asString();

    req->attributes()->insert(CURRENT_USER_INFO_KEY, userInfo);
    spdlog::info("AuthMiddleware: User {} (ID: {}) authenticated with role '{}' for path: {}",
                 userInfo.username, userInfo.userId, userInfo.role, req->path());

    // Continue to the next filter or controller
    fccb();
}

bool AuthMiddleware::hasRole(const drogon::HttpRequestPtr &req, const std::string& requiredRole) {
    if (req->attributes()->find(CURRENT_USER_INFO_KEY) == req->attributes()->end()) {
        spdlog::error("AuthMiddleware::hasRole: UserInfo not found in request attributes.");
        return false; // Should not happen if AuthMiddleware ran successfully
    }
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);
    bool has = (userInfo.role == requiredRole);
    if (!has) {
        spdlog::warn("User {} (ID: {}) with role '{}' attempted to access resource requiring role '{}'.",
                     userInfo.username, userInfo.userId, userInfo.role, requiredRole);
    }
    return has;
}