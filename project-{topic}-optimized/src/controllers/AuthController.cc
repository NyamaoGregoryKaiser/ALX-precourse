#include "AuthController.h"
#include "repositories/UserRepository.h"
#include "middleware/ErrorHandler.h"
#include <drogon/HttpAppFramework.h>
#include <spdlog/spdlog.h>

AuthController::AuthController() {
    auto dbClient = drogon::app().getDbClient(AppConfig::getInstance().getString("db_connection_name"));
    if (!dbClient) {
        spdlog::critical("AuthController: Failed to get DB client. Check app_config.json db_connection_name.");
        throw std::runtime_error("Database client not available.");
    }
    auto userRepo = std::make_shared<repositories::UserRepository>(dbClient);
    authService_ = std::make_shared<services::AuthService>(userRepo);
}

void AuthController::registerUser(const drogon::HttpRequestPtr &req,
                                  std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("username") || !reqJson["username"].isString() ||
        !reqJson.isMember("email") || !reqJson["email"].isString() ||
        !reqJson.isMember("password") || !reqJson["password"].isString()) {
        throw BadRequestError("Missing 'username', 'email', or 'password' in request body.");
    }

    std::string username = reqJson["username"].asString();
    std::string email = reqJson["email"].asString();
    std::string password = reqJson["password"].asString();

    auto result = authService_->registerUser(username, email, password);

    Json::Value respJson;
    if (result.success) {
        respJson["message"] = result.message;
        respJson["token"] = result.token;
        respJson["user_id"] = result.userId;
        respJson["role"] = result.role;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        callback(resp);
    } else {
        throw InternalServerError(result.message); // Should ideally be caught by AuthService and throw specific error
    }
}

void AuthController::loginUser(const drogon::HttpRequestPtr &req,
                               std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("username_or_email") || !reqJson["username_or_email"].isString() ||
        !reqJson.isMember("password") || !reqJson["password"].isString()) {
        throw BadRequestError("Missing 'username_or_email' or 'password' in request body.");
    }

    std::string usernameOrEmail = reqJson["username_or_email"].asString();
    std::string password = reqJson["password"].asString();

    auto result = authService_->loginUser(usernameOrEmail, password);

    Json::Value respJson;
    respJson["message"] = result.message;
    respJson["token"] = result.token;
    respJson["user_id"] = result.userId;
    respJson["role"] = result.role;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
    callback(resp);
}