#include "UserController.h"
#include "../utils/JsonUtil.h"
#include "../constants/AppConstants.h"
#include <drogon/drogon.h>

UserController::UserController(drogon::orm::DbClientPtr dbClient)
    : userService_(dbClient) {}

bool UserController::isAdmin(const drogon::HttpRequestPtr& req) const {
    if (req->attributes()->find("userRoles") == req->attributes()->end()) {
        return false;
    }
    const auto& roles = req->attributes()->get<std::vector<std::string>>("userRoles");
    for (const auto& role : roles) {
        if (role == AppConstants::ROLE_ADMIN) {
            return true;
        }
    }
    return false;
}

bool UserController::isSelf(const drogon::HttpRequestPtr& req, int64_t targetUserId) const {
    if (req->attributes()->find("userId") == req->attributes()->end()) {
        return false;
    }
    int64_t currentUserId = req->attributes()->get<int64_t>("userId");
    return currentUserId == targetUserId;
}


void UserController::getAllUsers(const drogon::HttpRequestPtr& req,
                                 std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (!isAdmin(req)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback)]() mutable {
        drogon::AsyncTask<void> getAllUsersTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto users = co_await thisPtr->userService_.getAllUsers();
                Json::Value data(Json::arrayValue);
                for (const auto& user : users) {
                    data.append(user);
                }
                callback(JsonUtil::createSuccessResponse("Users retrieved successfully", data));
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in getAllUsers: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void UserController::getUserById(const drogon::HttpRequestPtr& req,
                                 std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                 std::string id) {
    int64_t userId = std::stoll(id);

    if (!isAdmin(req) && !isSelf(req, userId)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback), userId]() mutable {
        drogon::AsyncTask<void> getUserTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto user = co_await thisPtr->userService_.getUserById(userId);
                if (user.has_value()) {
                    callback(JsonUtil::createSuccessResponse("User retrieved successfully", user.value()));
                } else {
                    callback(JsonUtil::createNotFoundResponse(AppConstants::ERR_USER_NOT_FOUND));
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in getUserById: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void UserController::updateUser(const drogon::HttpRequestPtr& req,
                                std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                std::string id,
                                const Json::Value& pJson) {
    int64_t userId = std::stoll(id);

    // Only admin can update enabled status or other users
    // Users can only update their own username/email if not admin
    if (!isAdmin(req) && !isSelf(req, userId)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    // Prevent non-admin users from changing 'enabled' status
    if (!isAdmin(req) && pJson.isMember("enabled")) {
        callback(JsonUtil::createForbiddenResponse("Only administrators can change user enabled status."));
        return;
    }
    // Prevent non-admin users from updating others' emails/usernames
    if (!isAdmin(req) && !isSelf(req, userId) && (pJson.isMember("username") || pJson.isMember("email"))) {
         callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
         return;
    }


    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback), userId, pJson]() mutable {
        drogon::AsyncTask<void> updateUserTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto updatedUser = co_await thisPtr->userService_.updateUser(userId, pJson);
                if (updatedUser.has_value()) {
                    callback(JsonUtil::createSuccessResponse(AppConstants::MSG_USER_UPDATED, updatedUser.value()));
                } else {
                    // This could be due to user not found, or username/email conflict.
                    // A more granular error from UserService would be better.
                    if (co_await thisPtr->userService_.getUserById(userId).get()) { // Check if user exists
                        callback(JsonUtil::createErrorResponse(drogon::k409Conflict, "Username or email already exists."));
                    } else {
                        callback(JsonUtil::createNotFoundResponse(AppConstants::ERR_USER_NOT_FOUND));
                    }
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in updateUser: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void UserController::deleteUser(const drogon::HttpRequestPtr& req,
                                std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                std::string id) {
    int64_t userId = std::stoll(id);

    if (!isAdmin(req)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    if (isSelf(req, userId)) { // Prevent admin from deleting themselves via this endpoint for safety
        callback(JsonUtil::createForbiddenResponse("Administrators cannot delete their own account via this endpoint."));
        return;
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback), userId]() mutable {
        drogon::AsyncTask<void> deleteTask = [&]() -> drogon::AsyncTask<void> {
            try {
                if (co_await thisPtr->userService_.deleteUser(userId)) {
                    callback(JsonUtil::createSuccessResponse(AppConstants::MSG_USER_DELETED));
                } else {
                    callback(JsonUtil::createNotFoundResponse(AppConstants::ERR_USER_NOT_FOUND));
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in deleteUser: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void UserController::assignRoles(const drogon::HttpRequestPtr& req,
                                 std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                 std::string id,
                                 const Json::Value& pJson) {
    int64_t userId = std::stoll(id);

    if (!isAdmin(req)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    if (!pJson.isMember("roles") || !pJson["roles"].isArray()) {
        callback(JsonUtil::createBadRequestResponse("Missing or invalid 'roles' array in request body."));
        return;
    }

    std::vector<std::string> roleNames;
    for (const auto& role : pJson["roles"]) {
        if (role.isString()) {
            roleNames.push_back(role.asString());
        }
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback), userId, roleNames]() mutable {
        drogon::AsyncTask<void> assignRolesTask = [&]() -> drogon::AsyncTask<void> {
            try {
                if (co_await thisPtr->userService_.assignRolesToUser(userId, roleNames)) {
                    // Clear user roles from cache after update
                    CacheService::remove("user_roles_" + std::to_string(userId));
                    callback(JsonUtil::createSuccessResponse("Roles assigned successfully."));
                } else {
                    callback(JsonUtil::createErrorResponse(drogon::k400BadRequest, "Failed to assign roles. User not found or invalid roles."));
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in assignRoles: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void UserController::getUserRoles(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                  std::string id) {
    int64_t userId = std::stoll(id);

    if (!isAdmin(req) && !isSelf(req, userId)) {
        callback(JsonUtil::createForbiddenResponse(AppConstants::ERR_FORBIDDEN));
        return;
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, callback = std::move(callback), userId]() mutable {
        drogon::AsyncTask<void> getUserRolesTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto roles = co_await thisPtr->userService_.getUserRoles(userId);
                Json::Value data(Json::arrayValue);
                for (const auto& role : roles) {
                    data.append(role);
                }
                callback(JsonUtil::createSuccessResponse("User roles retrieved successfully", data));
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in getUserRoles: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}
```