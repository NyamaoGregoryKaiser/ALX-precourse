```cpp
#pragma once

#include <drogon/HttpController.h>
#include "../services/AuthService.h"
#include "../utils/ApiResponse.h"

// Drogon's controller class generation can be automated, but we do it manually for clarity.
class AuthController : public drogon::HttpController<AuthController> {
public:
    AuthController(AuthService& authService) : authService_(authService) {}

    METHOD_LIST_BEGIN
    // registerHandler
    ADD_METHOD_TO(AuthController::registerHandler, "/api/v1/auth/register", drogon::Post, "RateLimitFilter");
    // loginHandler
    ADD_METHOD_TO(AuthController::loginHandler, "/api/v1/auth/login", drogon::Post, "RateLimitFilter");
    METHOD_LIST_END

    void registerHandler(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void loginHandler(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    AuthService& authService_;
};
```