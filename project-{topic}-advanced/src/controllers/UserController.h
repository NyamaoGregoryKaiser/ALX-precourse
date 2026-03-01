#ifndef USER_CONTROLLER_H
#define USER_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "../services/UserService.h"
#include "../middleware/AuthMiddleware.h" // Needed for filter setup

class UserController : public drogon::HttpController<UserController> {
public:
    UserController() {}
    UserController(drogon::orm::DbClientPtr dbClient);

    METHOD_LIST_BEGIN
    // Get all users (Admin only)
    METHOD_ADD(UserController::getAllUsers, "/users", drogon::Get, "AuthMiddleware::(admin)");
    // Get user by ID (Admin or self)
    METHOD_ADD(UserController::getUserById, "/users/{id}", drogon::Get, "AuthMiddleware");
    // Update user by ID (Admin or self)
    METHOD_ADD(UserController::updateUser, "/users/{id}", drogon::Patch, "AuthMiddleware");
    // Delete user by ID (Admin only)
    METHOD_ADD(UserController::deleteUser, "/users/{id}", drogon::Delete, "AuthMiddleware::(admin)");
    // Assign roles to user (Admin only)
    METHOD_ADD(UserController::assignRoles, "/users/{id}/roles", drogon::Put, "AuthMiddleware::(admin)");
    // Get user roles (Admin or self)
    METHOD_ADD(UserController::getUserRoles, "/users/{id}/roles", drogon::Get, "AuthMiddleware");

    METHOD_LIST_END

    void getAllUsers(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    void getUserById(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     std::string id);

    void updateUser(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    std::string id,
                    const Json::Value& pJson);

    void deleteUser(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    std::string id);

    void assignRoles(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     std::string id,
                     const Json::Value& pJson);

    void getUserRoles(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      std::string id);

private:
    UserService userService_;

    // Helper to check if current user is admin
    bool isAdmin(const drogon::HttpRequestPtr& req) const;

    // Helper to check if current user is the target user
    bool isSelf(const drogon::HttpRequestPtr& req, int64_t targetUserId) const;
};

#endif // USER_CONTROLLER_H
```