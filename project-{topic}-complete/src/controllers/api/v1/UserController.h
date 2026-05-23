```cpp
#pragma once

#include <drogon/HttpController.h>
#include "models/User.h"
#include "services/AuthService.h"

namespace CMS::Controllers::API::V1 {

class UserController : public drogon::HttpController<UserController> {
public:
    METHOD_LIST_BEGIN
    // Authentication required for all user operations except creation
    METHOD_ADD(UserController::createUser, "/users", drogon::Post, "RateLimitFilter");
    METHOD_ADD(UserController::getUsers, "/users", drogon::Get, "AuthFilter", "RateLimitFilter");
    METHOD_ADD(UserController::getUserById, "/users/{id}", drogon::Get, "AuthFilter", "RateLimitFilter");
    METHOD_ADD(UserController::updateUser, "/users/{id}", drogon::Put, "AuthFilter", "RateLimitFilter");
    METHOD_ADD(UserController::deleteUser, "/users/{id}", drogon::Delete, "AuthFilter", "RateLimitFilter");
    METHOD_LIST_END

    UserController();

    void createUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getUsers(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getUserById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);
    void updateUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);
    void deleteUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);

private:
    CMS::Models::UserMapper userMapper_;
    CMS::Services::AuthService authService_;
    // Helper to check authorization
    bool checkAuthorization(const drogon::HttpRequestPtr& req, const std::string& requiredRole, drogon::HttpResponsePtr& resp);
};

} // namespace CMS::Controllers::API::V1
```