#pragma once

#include <drogon/HttpController.h>
#include <memory>
#include "services/UserService.h"
#include "middleware/AuthMiddleware.h" // For filter and UserInfo

class UserController : public drogon::HttpController<UserController> {
public:
    UserController();

    METHOD_LIST_BEGIN
    // Get current user profile (requires authentication)
    METHOD_ADD(UserController::getProfile, "/profile", {drogon::HttpMethod::Get}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Get all users
    METHOD_ADD(UserController::getAllUsers, "/admin/users", {drogon::HttpMethod::Get}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Get user by ID
    METHOD_ADD(UserController::getUserById, "/admin/users/{id}", {drogon::HttpMethod::Get}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Update user by ID
    METHOD_ADD(UserController::updateUser, "/admin/users/{id}", {drogon::HttpMethod::Put}, "AuthMiddleware", "ErrorHandler");

    // Admin only: Delete user by ID
    METHOD_ADD(UserController::deleteUser, "/admin/users/{id}", {drogon::HttpMethod::Delete}, "AuthMiddleware", "ErrorHandler");
    METHOD_LIST_END

    void getProfile(const drogon::HttpRequestPtr &req,
                    std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void getAllUsers(const drogon::HttpRequestPtr &req,
                     std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                     const std::vector<std::string>& pathParams);

    void getUserById(const drogon::HttpRequestPtr &req,
                     std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                     long long id);

    void updateUser(const drogon::HttpRequestPtr &req,
                    std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                    long long id);

    void deleteUser(const drogon::HttpRequestPtr &req,
                    std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                    long long id);

private:
    std::shared_ptr<services::UserService> userService_;

    // Helper to check for admin role
    void requireAdmin(const drogon::HttpRequestPtr &req);
};