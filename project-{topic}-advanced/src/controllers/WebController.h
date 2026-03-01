#ifndef WEB_CONTROLLER_H
#define WEB_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/HttpAppFramework.h>

class WebController : public drogon::HttpController<WebController> {
public:
    METHOD_LIST_BEGIN
    METHOD_ADD(WebController::showRegisterPage, "/", drogon::Get);
    METHOD_ADD(WebController::showRegisterPage, "/register", drogon::Get);
    METHOD_ADD(WebController::showLoginPage, "/login", drogon::Get);
    METHOD_LIST_END

    void showRegisterPage(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void showLoginPage(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::string getJwtSecret(); // Helper to retrieve JWT secret
};

#endif // WEB_CONTROLLER_H
```