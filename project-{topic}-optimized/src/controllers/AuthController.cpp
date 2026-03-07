```cpp
#include "AuthController.h"
#include <json/json.h>

void AuthController::registerHandler(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (!jsonBody.isMember("username") || !jsonBody.isMember("email") || !jsonBody.isMember("password")) {
            return callback(ApiResponse::makeErrorResponse("Missing username, email, or password", drogon::k400BadRequest));
        }

        std::string username = jsonBody["username"].asString();
        std::string email = jsonBody["email"].asString();
        std::string password = jsonBody["password"].asString();

        // Validate inputs (e.g., email format, password strength)
        if (username.empty() || email.empty() || password.empty()) {
            return callback(ApiResponse::makeErrorResponse("Fields cannot be empty", drogon::k400BadRequest));
        }
        if (password.length() < 8) {
            return callback(ApiResponse::makeErrorResponse("Password must be at least 8 characters long", drogon::k400BadRequest));
        }

        drogon::app().getLoop()->queueInLoop([this, username, email, password, callback]() {
            drogon::Task<std::pair<User, std::string>> task = authService_.registerUser(username, email, password);
            std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest(); // Keep a weak ref to req

            task.then([this, callback, weakReq](std::pair<User, std::string> result) {
                if (auto sharedReq = weakReq.lock()) { // Check if req is still valid
                    Json::Value responseData;
                    responseData["user"] = result.first.toJson();
                    responseData["token"] = result.second;
                    callback(ApiResponse::makeSuccessResponse(responseData, "User registered successfully"));
                }
            }).except([callback, weakReq](const drogon::HttpException& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                }
            }).except([callback, weakReq](const std::exception& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    LOG_ERROR << "Unhandled exception in registerHandler: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            });
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in registerHandler: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}


void AuthController::loginHandler(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (!jsonBody.isMember("email") || !jsonBody.isMember("password")) {
            return callback(ApiResponse::makeErrorResponse("Missing email or password", drogon::k400BadRequest));
        }

        std::string email = jsonBody["email"].asString();
        std::string password = jsonBody["password"].asString();

        if (email.empty() || password.empty()) {
            return callback(ApiResponse::makeErrorResponse("Fields cannot be empty", drogon::k400BadRequest));
        }
        
        drogon::app().getLoop()->queueInLoop([this, email, password, callback]() {
            drogon::Task<std::optional<std::string>> task = authService_.loginUser(email, password);
            std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

            task.then([this, callback, weakReq](std::optional<std::string> token) {
                if (auto sharedReq = weakReq.lock()) {
                    if (token.has_value()) {
                        Json::Value responseData;
                        responseData["token"] = token.value();
                        callback(ApiResponse::makeSuccessResponse(responseData, "Login successful"));
                    } else {
                        callback(ApiResponse::makeErrorResponse("Invalid credentials", drogon::k401Unauthorized));
                    }
                }
            }).except([callback, weakReq](const drogon::HttpException& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                }
            }).except([callback, weakReq](const std::exception& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    LOG_ERROR << "Unhandled exception in loginHandler: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            });
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in loginHandler: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}
```