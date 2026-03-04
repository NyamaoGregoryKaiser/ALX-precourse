#pragma once

#include "Middleware.h"
#include "utils/JWT.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp"

class AuthMiddleware : public Middleware {
public:
    AuthMiddleware() = default;
    
    HttpResponse handle(HttpRequest& request) override {
        // Check for Authorization header
        auto it = request.headers.find("Authorization");
        if (it == request.headers.end()) {
            Logger::warn("AuthMiddleware: Missing Authorization header.");
            return HttpResponse(http::status::unauthorized, nlohmann::json({{"error", "Unauthorized"}}).dump());
        }

        std::string auth_header = it->second;
        if (auth_header.rfind("Bearer ", 0) != 0) { // Check if it starts with "Bearer "
            Logger::warn("AuthMiddleware: Invalid Authorization header format.");
            return HttpResponse(http::status::unauthorized, nlohmann::json({{"error", "Unauthorized"}}).dump());
        }

        std::string token = auth_header.substr(7); // Extract token after "Bearer "

        // Validate token
        try {
            std::string user_id = JWT::verifyToken(token, AppConfig().getJwtSecret());
            request.user_id = user_id; // Attach user_id to request for downstream handlers
            Logger::debug("AuthMiddleware: Token valid for user_id: " + user_id);
            return HttpResponse(http::status::continue_status); // Continue processing
        } catch (const std::exception& e) {
            Logger::warn("AuthMiddleware: Invalid token - " + std::string(e.what()));
            return HttpResponse(http::status::forbidden, nlohmann::json({{"error", "Forbidden", "details", e.what()}}).dump());
        }
    }
};