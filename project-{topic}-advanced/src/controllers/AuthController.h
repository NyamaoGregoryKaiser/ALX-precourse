#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "../services/AuthService.h"
#include "../middleware/RateLimiterFilter.h" // Assuming RateLimiter can be a filter

class AuthController : public drogon::HttpController<AuthController> {
public:
    AuthController() {}
    AuthController(drogon::orm::DbClientPtr dbClient);

    METHOD_LIST_BEGIN
    // Register API
    METHOD_ADD(AuthController::registerUser, "/register", drogon::Post, "RateLimiterFilter");
    // Login API
    METHOD_ADD(AuthController::loginUser, "/login", drogon::Post, "RateLimiterFilter");
    // Logout API (requires authentication)
    METHOD_ADD(AuthController::logoutUser, "/logout", drogon::Post, "AuthMiddleware");
    METHOD_LIST_END

    void registerUser(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const Json::Value& pJson);

    void loginUser(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const Json::Value& pJson);

    void logoutUser(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    AuthService authService_;
};

#endif // AUTH_CONTROLLER_H
```