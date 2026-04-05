```cpp
#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "services/AuthService.h"
#include "utils/AppErrors.h"
#include "utils/JsonUtils.h"

using namespace drogon;
using namespace drogon::orm;
using namespace TaskManager;

/**
 * @brief Controller for user authentication endpoints (register, login).
 */
class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    // Use `filters(RateLimitFilter)` to apply rate limiting to these endpoints
    ADD_METHOD_TO(AuthController::registerUser, "/auth/register", Post, "RateLimitFilter");
    ADD_METHOD_TO(AuthController::login, "/auth/login", Post, "RateLimitFilter");
    METHOD_LIST_END

    AuthController();

    /**
     * @brief Handles user registration requests.
     * POST /auth/register
     * Request Body: { "username": "...", "email": "...", "password": "..." }
     * Response: { "message": "User registered successfully", "user_id": 1, "username": "..." }
     */
    void registerUser(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Handles user login requests.
     * POST /auth/login
     * Request Body: { "username": "...", "password": "..." }
     * Response: { "message": "Login successful", "token": "...", "user": { ... } }
     */
    void login(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<AuthService> _authService;

    // Helper for sending error responses
    HttpResponsePtr createErrorResponse(const std::string& message, HttpStatusCode code) {
        Json::Value respJson;
        respJson["message"] = message;
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(code);
        return resp;
    }
};

} // namespace TaskManager

#endif // AUTH_CONTROLLER_H
```