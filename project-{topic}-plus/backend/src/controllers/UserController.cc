```cpp
#include "UserController.h"
#include <json/json.h>

using namespace TaskManager;

UserController::UserController() {
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Database client not available!";
        throw std::runtime_error("Database client not available for UserController.");
    }
    _userService = std::make_shared<UserService>(dbClient);
}

void UserController::getMe(const HttpRequestPtr& req,
                             std::function<void(const HttpResponsePtr&)>&& callback) {
    try {
        int userId = req->attributes()->get<int>("user_id");
        User user = _userService->getUserById(userId);

        Json::Value respJson = userToJson(user);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getMe: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void UserController::getUserById(const HttpRequestPtr& req,
                                   std::function<void(const HttpResponsePtr&)>&& callback,
                                   int id) {
    try {
        int authUserId = req->attributes()->get<int>("user_id");
        std::string authUserRole = req->attributes()->get<std::string>("user_role");

        // Allow user to fetch their own profile, or admin to fetch any profile
        if (authUserId != id && authUserRole != "admin") {
            callback(createErrorResponse("Forbidden: You can only view your own profile unless you are an admin.", k403Forbidden));
            return;
        }

        User user = _userService->getUserById(id);
        Json::Value respJson = userToJson(user);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getUserById: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void UserController::getAllUsers(const HttpRequestPtr& req,
                                   std::function<void(const HttpResponsePtr&)>&& callback) {
    try {
        // AdminFilter already ensures only admins reach here
        std::vector<User> users = _userService->getAllUsers();

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& user : users) {
            respJsonArray.append(userToJson(user));
        }
        auto resp = HttpResponse::newHttpJsonResponse(respJsonArray);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getAllUsers: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void UserController::updateMe(const HttpRequestPtr& req,
                                std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        int userId = req->attributes()->get<int>("user_id");

        std::optional<std::string> username_opt = JsonUtils::getOptionalString(reqJson, "username");
        std::optional<std::string> email_opt = JsonUtils::getOptionalString(reqJson, "email");

        // If no fields provided, return early
        if (!username_opt && !email_opt) {
            callback(createErrorResponse("No fields provided for update.", k400BadRequest));
            return;
        }

        User updatedUser = _userService->updateUserProfile(userId, username_opt, email_opt);

        Json::Value respJson;
        respJson["message"] = "User profile updated successfully";
        respJson["user"] = userToJson(updatedUser);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const ConflictException& e) {
        callback(createErrorResponse(e.what(), k409Conflict));
    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in updateMe: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void UserController::deleteUser(const HttpRequestPtr& req,
                                  std::function<void(const HttpResponsePtr&)>&& callback,
                                  int id) {
    try {
        int authUserId = req->attributes()->get<int>("user_id");
        std::string authUserRole = req->attributes()->get<std::string>("user_role");

        // Allow user to delete their own account, or admin to delete any account
        if (authUserId != id && authUserRole != "admin") {
            callback(createErrorResponse("Forbidden: You can only delete your own account unless you are an admin.", k403Forbidden));
            return;
        }

        _userService->deleteUser(id);

        Json::Value respJson;
        respJson["message"] = "User deleted successfully";
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in deleteUser: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}
```