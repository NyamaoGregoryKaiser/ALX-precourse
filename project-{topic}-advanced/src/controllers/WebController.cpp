#include "WebController.h"
#include <drogon/drogon.h>
#include "../constants/AppConstants.h"

// For simplicity, we get JWT_SECRET directly here for client-side JS.
// In a real app, you might expose a public key or use a different mechanism
// if client-side validation is needed, but typically only the server validates.
std::string WebController::getJwtSecret() {
    char* secret_env = getenv(AppConstants::JWT_SECRET_ENV_VAR.c_str());
    if (secret_env) {
        return secret_env;
    }
    return ""; // Should log error in production
}

void WebController::showRegisterPage(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpViewResponse("register.html");
    // Optionally pass data to the view, e.g., a CSRF token
    // Json::Value data;
    // data["csrf_token"] = "some_random_token";
    // resp->set ==(data);
    callback(resp);
}

void WebController::showLoginPage(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpViewResponse("login.html");
    // Optionally pass data to the view
    // Json::Value data;
    // data["jwtSecret"] = getJwtSecret(); // Not for client-side use, just an example of passing data
    // resp->set ==(data);
    callback(resp);
}
```