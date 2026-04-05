```cpp
#include "AuthController.h"
#include <json/json.h>

using namespace TaskManager;

AuthController::AuthController() {
    // Get default DB client from drogon app
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Database client not available!";
        throw std::runtime_error("Database client not available for AuthController.");
    }
    _authService = std::make_shared<AuthService>(dbClient);
}

void AuthController::registerUser(const HttpRequestPtr& req,
                                  std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        std::string username = JsonUtils::getString(reqJson, "username");
        std::string email = JsonUtils::getString(reqJson, "email");
        std::string password = JsonUtils::getString(reqJson, "password");

        User newUser = _authService->registerUser(username, email, password);

        Json::Value respJson;
        respJson["message"] = "User registered successfully";
        respJson["user_id"] = newUser.getId();
        respJson["username"] = newUser.getUsername();
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k201Created);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const ConflictException& e) {
        callback(createErrorResponse(e.what(), k409Conflict));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in registerUser: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void AuthController::login(const HttpRequestPtr& req,
                           std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        std::string username = JsonUtils::getString(reqJson, "username");
        std::string password = JsonUtils::getString(reqJson, "password");

        auto [user, token] = _authService->loginUser(username, password);

        Json::Value respJson;
        respJson["message"] = "Login successful";
        respJson["token"] = token;
        Json::Value userJson;
        userJson["id"] = user.getId();
        userJson["username"] = user.getUsername();
        userJson["email"] = user.getEmail();
        userJson["role"] = user.getRole();
        respJson["user"] = userJson;

        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const AuthException& e) {
        callback(createErrorResponse(e.what(), k401Unauthorized));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in login: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}
```