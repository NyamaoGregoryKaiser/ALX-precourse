```cpp
#pragma once

#include <drogon/HttpController.h>
#include "services/AuthService.h"

namespace CMS::Controllers::API::V1 {

class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    METHOD_ADD(AuthController::login, "/login", drogon::Post, "RateLimitFilter");
    METHOD_LIST_END

    AuthController();
    void login(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    CMS::Services::AuthService authService_;
};

} // namespace CMS::Controllers::API::V1
```