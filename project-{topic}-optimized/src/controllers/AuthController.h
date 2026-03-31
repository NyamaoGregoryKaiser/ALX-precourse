#pragma once

#include <drogon/HttpController.h>
#include <memory>
#include "services/AuthService.h"

class AuthController : public drogon::HttpController<AuthController> {
public:
    AuthController();

    METHOD_LIST_BEGIN
    METHOD_ADD(AuthController::registerUser, "/register", {drogon::HttpMethod::Post}, "ErrorHandler");
    METHOD_ADD(AuthController::loginUser, "/login", {drogon::HttpMethod::Post}, "ErrorHandler");
    METHOD_LIST_END

    void registerUser(const drogon::HttpRequestPtr &req,
                      std::function<void (const drogon::HttpResponsePtr &)> &&callback);

    void loginUser(const drogon::HttpRequestPtr &req,
                   std::function<void (const drogon::HttpResponsePtr &)> &&callback);

private:
    std::shared_ptr<services::AuthService> authService_;
};