#include "UserController.h"
#include "repositories/UserRepository.h"
#include "middleware/ErrorHandler.h"
#include <drogon/HttpAppFramework.h>
#include <spdlog/spdlog.h>

UserController::UserController() {
    auto dbClient = drogon::app().getDbClient(AppConfig::getInstance().getString("db_connection_name"));
    if (!dbClient) {
        spdlog::critical("UserController: Failed to get DB client. Check app_config.json db_connection_name.");
        throw std::runtime_error("Database client not available.");
    }
    auto userRepo = std::make_shared<repositories::UserRepository>(dbClient);
    userService_ = std::make_shared<services::UserService>(userRepo);
}

void UserController::requireAdmin(const drogon::HttpRequestPtr &req) {
    if (!AuthMiddleware::hasRole(req, "admin")) {
        throw ForbiddenError("Access forbidden: Admin privileges required.");
    }
}

void UserController::getProfile(const drogon::HttpRequestPtr &req,
                                std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
    const auto& userInfo = req->attributes()->get<UserInfo>(CURRENT_USER_INFO_KEY);

    auto user = userService_->getUserById(userInfo.userId);
    if (!user) {
        throw NotFoundError("User profile not found. This indicates an internal data inconsistency.");
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(user->toJson());
    callback(resp);
}

void UserController::getAllUsers(const drogon::HttpRequestPtr &req,
                                 std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                 const std::vector<std::string>& pathParams) {
    requireAdmin(req);

    auto users = userService_->getAllUsers();
    Json::Value usersJsonArray;
    for (const auto& user : users) {
        usersJsonArray.append(user.toJson());
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(usersJsonArray);
    callback(resp);
}

void UserController::getUserById(const drogon::HttpRequestPtr &req,
                                 std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                 long long id) {
    requireAdmin(req);

    auto user = userService_->getUserById(id);
    if (!user) {
        throw NotFoundError("User not found.");
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(user->toJson());
    callback(resp);
}

void UserController::updateUser(const drogon::HttpRequestPtr &req,
                                std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                long long id) {
    requireAdmin(req);

    Json::Value reqJson;
    try {
        reqJson = req->get  A  JSON_VALUE_AS_STRING();
    } catch (const std::exception& e) {
        throw BadRequestError("Invalid JSON body.");
    }

    if (!reqJson.isMember("username") || !reqJson["username"].isString() ||
        !reqJson.isMember("email") || !reqJson["email"].isString() ||
        !reqJson.isMember("role") || !reqJson["role"].isString()) {
        throw BadRequestError("Missing 'username', 'email', or 'role' in request body.");
    }

    std::string username = reqJson["username"].asString();
    std::string email = reqJson["email"].asString();
    std::string role = reqJson["role"].asString();

    if (userService_->updateUser(id, username, email, role)) {
        Json::Value respJson;
        respJson["message"] = "User updated successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw InternalServerError("Failed to update user. User might not exist or internal error.");
    }
}

void UserController::deleteUser(const drogon::HttpRequestPtr &req,
                                std::function<void (const drogon::HttpResponsePtr &)> &&callback,
                                long long id) {
    requireAdmin(req);

    if (userService_->deleteUser(id)) {
        Json::Value respJson;
        respJson["message"] = "User deleted successfully.";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(drogon::k200OK);
        callback(resp);
    } else {
        throw NotFoundError("User not found or already deleted.");
    }
}