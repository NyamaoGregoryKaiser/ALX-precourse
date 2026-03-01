#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <json/json.h>
#include <thread>
#include <chrono>
#include <string>
#include <stdexcept>
#include "../../src/constants/AppConstants.h"

// Helper function to create an HTTP client and send requests
drogon::HttpClientPtr httpClient = nullptr;
const std::string BASE_URL = "http://127.0.0.1:8080" + AppConstants::API_V1_PREFIX;

// Ensure DB is clean before tests, and JWT_SECRET is set
// This setup is for integration testing against a running Drogon instance.
// In CI, this means the Docker container is running.

class AuthApiTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Create an HTTP client if not already created
        if (!httpClient) {
            httpClient = drogon::HttpClient::newHttpClient("http://127.0.0.1:8080");
        }
        // Ensure a clean state for the database (e.g., delete test users)
        // This would require direct DB access or an admin endpoint.
        // For simplicity, we assume unique test data.
        // In a real integration test, you would truncate tables or use transactions.
    }

    void TearDown() override {
        // Cleanup after tests (e.g., delete created users)
    }

    Json::Value sendRequest(drogon::HttpMethod method,
                            const std::string& path,
                            const Json::Value& body = Json::Value(),
                            const std::string& token = "") {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(method);
        req->setPath(AppConstants::API_V1_PREFIX + path);
        if (!body.empty()) {
            req->setBody(body.toStyledString());
            req->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        }
        if (!token.empty()) {
            req->addHeader("Authorization", "Bearer " + token);
        }

        std::promise<Json::Value> promise;
        httpClient->sendRequest(req, [&](drogon::ReqResult result, const drogon::HttpResponsePtr &resp) {
            if (result == drogon::ReqResult::Ok) {
                if (resp->statusCode() >= 200 && resp->statusCode() < 300) {
                    promise.set_value(resp->getJsonObject());
                } else {
                    LOG_ERROR << "Request failed: " << resp->statusCode() << " - " << resp->getBody();
                    Json::Value err;
                    err["error"] = resp->getJsonObject() ? resp->getJsonObject()["message"].asString() : resp->getBody();
                    err["status"] = resp->statusCode();
                    promise.set_value(err); // Return error response
                }
            } else {
                LOG_ERROR << "HTTP client error: " << static_cast<int>(result);
                Json::Value err;
                err["error"] = "HTTP client error";
                err["status"] = 500;
                promise.set_value(err);
            }
        });
        return promise.get_future().get();
    }
};

// Test /api/v1/register
TEST_F(AuthApiTest, RegisterUserSuccess) {
    Json::Value user_data;
    user_data["username"] = "testuser_register";
    user_data["email"] = "testregister@example.com";
    user_data["password"] = "password123";

    Json::Value response = sendRequest(drogon::Post, "/register", user_data);

    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["message"].asString(), AppConstants::MSG_REGISTER_SUCCESS);
    ASSERT_TRUE(response["data"].isObject());
    ASSERT_EQ(response["data"]["username"].asString(), "testuser_register");
    ASSERT_EQ(response["data"]["email"].asString(), "testregister@example.com");
}

TEST_F(AuthApiTest, RegisterUserExists) {
    // Register once
    Json::Value user_data;
    user_data["username"] = "existing_user";
    user_data["email"] = "existing@example.com";
    user_data["password"] = "password123";
    sendRequest(drogon::Post, "/register", user_data); // Ignore response

    // Try to register again with same username/email
    Json::Value response = sendRequest(drogon::Post, "/register", user_data);
    ASSERT_EQ(response["status"].asInt(), 409); // Conflict
    ASSERT_EQ(response["error"].asString(), AppConstants::ERR_USER_EXISTS);
}

TEST_F(AuthApiTest, RegisterMissingFields) {
    Json::Value user_data;
    user_data["username"] = "incomplete_user"; // Missing email and password
    Json::Value response = sendRequest(drogon::Post, "/register", user_data);
    ASSERT_EQ(response["status"].asInt(), 400); // Bad Request
    ASSERT_EQ(response["error"].asString(), AppConstants::ERR_MISSING_FIELDS);
}


// Test /api/v1/login
TEST_F(AuthApiTest, LoginUserSuccess) {
    // First, register a user for login test
    Json::Value register_data;
    register_data["username"] = "login_testuser";
    register_data["email"] = "login_test@example.com";
    register_data["password"] = "loginpassword123";
    sendRequest(drogon::Post, "/register", register_data);

    Json::Value login_data;
    login_data["identifier"] = "login_testuser";
    login_data["password"] = "loginpassword123";
    Json::Value response = sendRequest(drogon::Post, "/login", login_data);

    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["message"].asString(), AppConstants::MSG_LOGIN_SUCCESS);
    ASSERT_TRUE(response["data"].isObject());
    ASSERT_TRUE(response["data"].isMember("token"));
    ASSERT_FALSE(response["data"]["token"].asString().empty());
    ASSERT_EQ(response["data"]["user"]["username"].asString(), "login_testuser");
    ASSERT_TRUE(response["data"]["roles"].isArray());
    ASSERT_EQ(response["data"]["roles"][0].asString(), AppConstants::ROLE_USER);
}

TEST_F(AuthApiTest, LoginInvalidCredentials) {
    // Assuming 'nonexistent' user does not exist
    Json::Value login_data;
    login_data["identifier"] = "nonexistent";
    login_data["password"] = "wrongpassword";
    Json::Value response = sendRequest(drogon::Post, "/login", login_data);

    ASSERT_EQ(response["status"].asInt(), 401); // Unauthorized
    ASSERT_EQ(response["error"].asString(), AppConstants::ERR_INVALID_CREDENTIALS);

    // Test with correct user but wrong password
    Json::Value register_data;
    register_data["username"] = "wrongpass_user";
    register_data["email"] = "wrongpass@example.com";
    register_data["password"] = "correctpassword";
    sendRequest(drogon::Post, "/register", register_data);

    login_data["identifier"] = "wrongpass_user";
    login_data["password"] = "incorrect";
    response = sendRequest(drogon::Post, "/login", login_data);
    ASSERT_EQ(response["status"].asInt(), 401); // Unauthorized
    ASSERT_EQ(response["error"].asString(), AppConstants::ERR_INVALID_CREDENTIALS);
}

// Test /api/v1/logout
TEST_F(AuthApiTest, LogoutUserSuccess) {
    // Register and login to get a token
    Json::Value register_data;
    register_data["username"] = "logout_testuser";
    register_data["email"] = "logout_test@example.com";
    register_data["password"] = "logoutpassword123";
    sendRequest(drogon::Post, "/register", register_data);

    Json::Value login_data;
    login_data["identifier"] = "logout_testuser";
    login_data["password"] = "logoutpassword123";
    Json::Value login_response = sendRequest(drogon::Post, "/login", login_data);
    std::string token = login_response["data"]["token"].asString();
    ASSERT_FALSE(token.empty());

    // Now logout with the token
    Json::Value logout_response = sendRequest(drogon::Post, "/logout", Json::Value(), token);
    ASSERT_EQ(logout_response["status"].asInt(), 200);
    ASSERT_EQ(logout_response["message"].asString(), AppConstants::MSG_LOGOUT_SUCCESS);

    // Try to use the token again (should fail)
    Json::Value whoami_response = sendRequest(drogon::Get, "/users/1", Json::Value(), token); // Use an arbitrary user ID
    ASSERT_EQ(whoami_response["status"].asInt(), 401); // Unauthorized
}

TEST_F(AuthApiTest, LogoutInvalidToken) {
    Json::Value response = sendRequest(drogon::Post, "/logout", Json::Value(), "invalid.token.string");
    ASSERT_EQ(response["status"].asInt(), 401); // AuthMiddleware should catch this
}
```