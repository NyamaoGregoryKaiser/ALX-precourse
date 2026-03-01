#include "AuthController.h"
#include "../utils/JsonUtil.h"
#include "../constants/AppConstants.h"
#include "../utils/StringUtil.h"
#include <drogon/drogon.h>

AuthController::AuthController(drogon::orm::DbClientPtr dbClient)
    : authService_(dbClient) {}

void AuthController::registerUser(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                  const Json::Value& pJson) {
    if (!pJson.isMember("username") || !pJson["username"].isString() ||
        !pJson.isMember("email") || !pJson["email"].isString() ||
        !pJson.isMember("password") || !pJson["password"].isString()) {
        callback(JsonUtil::createBadRequestResponse(AppConstants::ERR_MISSING_FIELDS));
        return;
    }

    std::string username = StringUtil::trim(pJson["username"].asString());
    std::string email = StringUtil::trim(pJson["email"].asString());
    std::string password = pJson["password"].asString(); // Password should not be trimmed.

    if (username.empty() || email.empty() || password.empty()) {
        callback(JsonUtil::createBadRequestResponse(AppConstants::ERR_MISSING_FIELDS));
        return;
    }

    auto thisPtr = shared_from_this(); // Keep controller instance alive
    drogon::app().getLoop()->queueInLoop([thisPtr, req, callback = std::move(callback), username, email, password]() mutable {
        drogon::AsyncTask<void> registerTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto result = co_await thisPtr->authService_.registerUser(username, email, password);
                if (result.has_value()) {
                    callback(JsonUtil::createSuccessResponse(AppConstants::MSG_REGISTER_SUCCESS, result.value()));
                } else {
                    // AuthService::registerUser returns nullopt for user exists or internal error
                    // Need to differentiate based on specific error, e.g., by returning an error enum/code
                    // For now, assume user exists or generic server error.
                    // This implies the AuthService should provide more specific error codes.
                    auto existingUsers = co_await drogon::orm::Mapper<drogon_model::auth_system::User>(drogon::app().getDbClient()).findBy(
                        drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, username) ||
                        drogon::orm::Criteria("email", drogon::orm::CompareOperator::EQ, email)
                    );
                    if (!existingUsers.empty()) {
                        callback(JsonUtil::createErrorResponse(drogon::k409Conflict, AppConstants::ERR_USER_EXISTS));
                    } else {
                        callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
                    }
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in registerUser: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void AuthController::loginUser(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                               const Json::Value& pJson) {
    if (!pJson.isMember("identifier") || !pJson["identifier"].isString() ||
        !pJson.isMember("password") || !pJson["password"].isString()) {
        callback(JsonUtil::createBadRequestResponse(AppConstants::ERR_MISSING_FIELDS));
        return;
    }

    std::string identifier = StringUtil::trim(pJson["identifier"].asString());
    std::string password = pJson["password"].asString();

    if (identifier.empty() || password.empty()) {
        callback(JsonUtil::createBadRequestResponse(AppConstants::ERR_MISSING_FIELDS));
        return;
    }

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, req, callback = std::move(callback), identifier, password]() mutable {
        drogon::AsyncTask<void> loginTask = [&]() -> drogon::AsyncTask<void> {
            try {
                auto result = co_await thisPtr->authService_.loginUser(identifier, password);
                if (result.has_value()) {
                    callback(JsonUtil::createSuccessResponse(AppConstants::MSG_LOGIN_SUCCESS, result.value()));
                } else {
                    callback(JsonUtil::createUnauthorizedResponse(AppConstants::ERR_INVALID_CREDENTIALS));
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in loginUser: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}

void AuthController::logoutUser(const drogon::HttpRequestPtr& req,
                                std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    // Get the JWT token from the Authorization header (AuthMiddleware should have validated it)
    auto authHeader = req->getHeader("Authorization");
    std::string token = authHeader.substr(7); // "Bearer " is 7 chars

    auto thisPtr = shared_from_this();
    drogon::app().getLoop()->queueInLoop([thisPtr, req, callback = std::move(callback), token]() mutable {
        drogon::AsyncTask<void> logoutTask = [&]() -> drogon::AsyncTask<void> {
            try {
                if (co_await thisPtr->authService_.logoutUser(token)) {
                    callback(JsonUtil::createSuccessResponse(AppConstants::MSG_LOGOUT_SUCCESS));
                } else {
                    callback(JsonUtil::createErrorResponse(drogon::k400BadRequest, "Failed to logout or token already invalid."));
                }
            } catch (const std::exception& e) {
                LOG_ERROR << "Exception in logoutUser: " << e.what();
                callback(JsonUtil::createInternalErrorResponse(AppConstants::ERR_INTERNAL_SERVER_ERROR));
            }
        }();
    });
}
```