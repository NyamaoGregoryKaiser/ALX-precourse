```cpp
#ifndef USER_CONTROLLER_H
#define USER_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "services/UserService.h"
#include "utils/AppErrors.h"
#include "utils/JsonUtils.h"
#include "filters/AuthFilter.h"
#include "filters/AdminFilter.h"

using namespace drogon;
using namespace drogon::orm;
using namespace TaskManager;

/**
 * @brief Controller for user management endpoints.
 * Requires authentication for all endpoints, and admin role for some.
 */
class UserController : public drogon::HttpController<UserController> {
public:
    METHOD_LIST_BEGIN
    // /users/me - Get current user's profile (Auth required)
    ADD_METHOD_TO(UserController::getMe, "/users/me", Get, "AuthFilter");
    // /users/{id} - Get user by ID (Auth required, Admin can see any, User can see own)
    ADD_METHOD_TO(UserController::getUserById, "/users/{id}", Get, "AuthFilter");
    // /users - Get all users (Auth required, Admin only)
    ADD_METHOD_TO(UserController::getAllUsers, "/users", Get, "AuthFilter", "AdminFilter");
    // /users/me - Update current user's profile (Auth required)
    ADD_METHOD_TO(UserController::updateMe, "/users/me", Patch, "AuthFilter");
    // /users/{id} - Delete user by ID (Auth required, Admin can delete any, User can delete own)
    ADD_METHOD_TO(UserController::deleteUser, "/users/{id}", Delete, "AuthFilter");
    METHOD_LIST_END

    UserController();

    /**
     * @brief Get the authenticated user's profile.
     * GET /users/me
     * Response: { "id": ..., "username": "...", "email": "...", "role": "..." }
     */
    void getMe(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Get a user's profile by ID.
     * GET /users/{id}
     * Response: { "id": ..., "username": "...", "email": "...", "role": "..." }
     */
    void getUserById(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Get all user profiles. (Admin only)
     * GET /users
     * Response: [ { "id": ..., "username": "...", "email": "...", "role": "..." }, ... ]
     */
    void getAllUsers(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Update the authenticated user's profile.
     * PATCH /users/me
     * Request Body: { "username": "...", "email": "..." } (fields are optional)
     * Response: { "message": "User profile updated", "user": { ... } }
     */
    void updateMe(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Delete a user by ID.
     * DELETE /users/{id}
     * Response: { "message": "User deleted successfully" }
     */
    void deleteUser(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

private:
    std::shared_ptr<UserService> _userService;

    // Helper for sending error responses
    HttpResponsePtr createErrorResponse(const std::string& message, HttpStatusCode code) {
        Json::Value respJson;
        respJson["message"] = message;
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(code);
        return resp;
    }

    Json::Value userToJson(const User& user) {
        Json::Value userJson;
        userJson["id"] = user.getId();
        userJson["username"] = user.getUsername();
        userJson["email"] = user.getEmail();
        userJson["role"] = user.getRole();
        // Do NOT expose password_hash
        return userJson;
    }
};

} // namespace TaskManager

#endif // USER_CONTROLLER_H
```