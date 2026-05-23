```cpp
#pragma once

#include <drogon/HttpController.h>
#include "services/AuthService.h"
#include "models/Post.h"
#include "models/Category.h"

namespace CMS::Controllers::Web {

class AdminController : public drogon::HttpController<AdminController> {
public:
    METHOD_LIST_BEGIN
    METHOD_ADD(AdminController::showLogin, "/admin/login", drogon::Get);
    METHOD_ADD(AdminController::adminLogin, "/admin/login", drogon::Post);
    METHOD_ADD(AdminController::adminDashboard, "/admin/dashboard", drogon::Get, "AuthFilter");
    METHOD_ADD(AdminController::managePosts, "/admin/posts", drogon::Get, "AuthFilter");
    METHOD_ADD(AdminController::logout, "/admin/logout", drogon::Get, "AuthFilter");
    METHOD_LIST_END

    AdminController();

    void showLogin(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void adminLogin(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void adminDashboard(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void managePosts(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void logout(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    CMS::Services::AuthService authService_;
    CMS::Models::PostMapper postMapper_;
    CMS::Models::CategoryMapper categoryMapper_;
};

} // namespace CMS::Controllers::Web
```