#pragma once

#include <drogon/HttpFilter.h>
#include <json/json.h> // For Json::Value

// Define a structure to hold user information from JWT claims
struct UserInfo {
    long long userId = 0;
    std::string username;
    std::string role; // e.g., "user", "admin"
    bool isAuthenticated = false;
};

// Custom request attribute to store UserInfo
// This allows controllers to easily access authenticated user details
#define CURRENT_USER_INFO_KEY "user_info"

class AuthMiddleware : public drogon::HttpFilter<AuthMiddleware> {
public:
    AuthMiddleware() = default;

    // Filter to handle authentication for routes that require it
    void doFilter(const drogon::HttpRequestPtr &req,
                  drogon::FilterCallback &&fcb,
                  drogon::FilterChainCallback &&fccb) override;

    // Method to check if the user has a specific role
    static bool hasRole(const drogon::HttpRequestPtr &req, const std::string& requiredRole);
};