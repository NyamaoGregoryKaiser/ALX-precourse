```cpp
#include "AuthController.h"
#include <drogon/drogon.h>
#include <json/json.h>

namespace CMS::Controllers::API::V1 {

AuthController::AuthController() : authService_(drogon::app().getDbClient()) {
    // Constructor initializes AuthService with the default DB client
}

void AuthController::login(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value reqJson;
    try {
        reqJson = req->getJsonObject();
        if (!reqJson.isMember("email") || !reqJson.isMember("password")) {
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody("{\"error\":\"Email and password are required\"}");
            callback(resp);
            return;
        }
    } catch (const std::exception& e) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(std::string("{\"error\":\"Invalid JSON format: ") + e.what() + "\"}");
        callback(resp);
        return;
    }

    std::string email = reqJson["email"].asString();
    std::string password = reqJson["password"].asString();

    authService_.authenticate(email, password).then([=](std::tuple<std::string, CMS::Models::User> authResult) {
        std::string token = std::get<0>(authResult);
        CMS::Models::User user = std::get<1>(authResult);

        Json::Value payload;
        payload["message"] = "Login successful";
        payload["token"] = token;
        payload["user"] = user.toJson();

        resp->setStatusCode(drogon::k200OK);
        resp->setBody(payload.toStyledString());
        callback(resp);
    }).via(drogon::app().get </drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "Login failed for email " << email << ": " << ex.what();
            resp->setStatusCode(drogon::k401Unauthorized);
            resp->setBody("{\"error\":\"Invalid credentials\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error during login for email " << email << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

} // namespace CMS::Controllers::API::V1
```