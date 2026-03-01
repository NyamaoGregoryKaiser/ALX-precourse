#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <json/json.h>
#include <thread>
#include <chrono>
#include <string>
#include <stdexcept>
#include "../../src/constants/AppConstants.h"

// Re-use helper functions from TestAuthAPI for consistency
extern drogon::HttpClientPtr httpClient;
extern const std::string BASE_URL;

class UserApiTest : public ::testing::Test {
protected:
    std::string adminToken;
    std::string userToken;
    int64_t adminUserId;
    int64_t standardUserId;

    void SetUp() override {
        if (!httpClient) {
            httpClient = drogon::HttpClient::newHttpClient("http://127.0.0.1:8080");
        }

        // 1. Ensure admin user exists and get token
        // Use seeded admin for this (username: admin, password: admin123)
        // You would typically log in to get a fresh token for tests.
        Json::Value admin_login_data;
        admin_login_data["identifier"] = "admin";
        admin_login_data["password"] = "admin123"; // Seeded password

        std::promise<Json::Value> admin_login_promise;
        auto admin_login_req = drogon::HttpRequest::newHttpRequest();
        admin_login_req->setMethod(drogon::Post);
        admin_login_req->setPath(AppConstants::API_V1_PREFIX + "/login");
        admin_login_req->setBody(admin_login_data.toStyledString());
        admin_login_req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        httpClient->sendRequest(admin_login_req, [&](drogon::ReqResult result, const drogon::HttpResponsePtr &resp) {
            if (result == drogon::ReqResult::Ok && resp->statusCode() == 200) {
                admin_login_promise.set_value(resp->getJsonObject());
            } else {
                LOG_FATAL << "Failed to log in admin for tests. Status: " << resp->statusCode() << ", Body: " << resp->getBody();
                admin_login_promise.set_exception(std::make_exception_ptr(std::runtime_error("Admin login failed")));
            }
        });
        Json::Value admin_login_response = admin_login_promise.get_future().get();
        adminToken = admin_login_response["data"]["token"].asString();
        adminUserId = admin_login_response["data"]["user"]["id"].asInt64();
        ASSERT_FALSE(adminToken.empty());
        ASSERT_NE(adminUserId, 0);

        // 2. Register and login a standard user
        Json::Value register_data;
        register_data["username"] = "testuser_standard";
        register_data["email"] = "standard@example.com";
        register_data["password"] = "standard123";
        sendRequest(drogon::Post, "/register", register_data);

        Json::Value user_login_data;
        user_login_data["identifier"] = "testuser_standard";
        user_login_data["password"] = "standard123";
        std::promise<Json::Value> user_login_promise;
        auto user_login_req = drogon::HttpRequest::newHttpRequest();
        user_login_req->setMethod(drogon::Post);
        user_login_req->setPath(AppConstants::API_V1_PREFIX + "/login");
        user_login_req->setBody(user_login_data.toStyledString());
        user_login_req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        httpClient->sendRequest(user_login_req, [&](drogon::ReqResult result, const drogon::HttpResponsePtr &resp) {
            if (result == drogon::ReqResult::Ok && resp->statusCode() == 200) {
                user_login_promise.set_value(resp->getJsonObject());
            } else {
                LOG_FATAL << "Failed to log in standard user for tests. Status: " << resp->statusCode() << ", Body: " << resp->getBody();
                user_login_promise.set_exception(std::make_exception_ptr(std::runtime_error("Standard user login failed")));
            }
        });
        Json::Value user_login_response = user_login_promise.get_future().get();
        userToken = user_login_response["data"]["token"].asString();
        standardUserId = user_login_response["data"]["user"]["id"].asInt64();
        ASSERT_FALSE(userToken.empty());
        ASSERT_NE(standardUserId, 0);
    }

    void TearDown() override {
        // Cleanup: Delete test user
        // sendRequest(drogon::Delete, "/users/" + std::to_string(standardUserId), Json::Value(), adminToken);
        // Logout admin and standard user tokens
        // sendRequest(drogon::Post, "/logout", Json::Value(), adminToken);
        // sendRequest(drogon::Post, "/logout", Json::Value(), userToken);
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
                    promise.set_value(err);
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

// Test /api/v1/users (GET all)
TEST_F(UserApiTest, AdminCanGetAllUsers) {
    Json::Value response = sendRequest(drogon::Get, "/users", Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_TRUE(response["data"].isArray());
    ASSERT_GT(response["data"].size(), 0); // Should have at least admin and standard user
}

TEST_F(UserApiTest, UserCannotGetAllUsers) {
    Json::Value response = sendRequest(drogon::Get, "/users", Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
    ASSERT_EQ(response["error"].asString(), AppConstants::ERR_FORBIDDEN);
}

// Test /api/v1/users/{id} (GET by ID)
TEST_F(UserApiTest, AdminCanGetUserById) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(standardUserId), Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["data"]["id"].asInt64(), standardUserId);
}

TEST_F(UserApiTest, UserCanGetSelfById) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(standardUserId), Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["data"]["id"].asInt64(), standardUserId);
}

TEST_F(UserApiTest, UserCannotGetOtherUserById) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(adminUserId), Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
}

TEST_F(UserApiTest, GetNonExistentUser) {
    Json::Value response = sendRequest(drogon::Get, "/users/99999", Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 404); // Not Found
}

// Test /api/v1/users/{id} (PATCH update)
TEST_F(UserApiTest, AdminCanUpdateUser) {
    Json::Value update_data;
    update_data["username"] = "updated_testuser_standard";
    Json::Value response = sendRequest(drogon::Patch, "/users/" + std::to_string(standardUserId), update_data, adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["data"]["username"].asString(), "updated_testuser_standard");
}

TEST_F(UserApiTest, UserCanUpdateSelf) {
    Json::Value update_data;
    update_data["email"] = "new_standard_email@example.com";
    Json::Value response = sendRequest(drogon::Patch, "/users/" + std::to_string(standardUserId), update_data, userToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["data"]["email"].asString(), "new_standard_email@example.com");
}

TEST_F(UserApiTest, UserCannotUpdateOtherUser) {
    Json::Value update_data;
    update_data["username"] = "bad_update";
    Json::Value response = sendRequest(drogon::Patch, "/users/" + std::to_string(adminUserId), update_data, userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
}

TEST_F(UserApiTest, UserCannotUpdateEnabledStatus) {
    Json::Value update_data;
    update_data["enabled"] = false;
    Json::Value response = sendRequest(drogon::Patch, "/users/" + std::to_string(standardUserId), update_data, userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden (specific message from controller)
}

// Test /api/v1/users/{id} (DELETE)
TEST_F(UserApiTest, AdminCanDeleteUser) {
    // Register another user to delete
    Json::Value register_data;
    register_data["username"] = "user_to_delete";
    register_data["email"] = "delete@example.com";
    register_data["password"] = "delete123";
    sendRequest(drogon::Post, "/register", register_data);

    Json::Value login_data;
    login_data["identifier"] = "user_to_delete";
    login_data["password"] = "delete123";
    Json::Value login_response = sendRequest(drogon::Post, "/login", login_data);
    int64_t userIdToDelete = login_response["data"]["user"]["id"].asInt64();

    Json::Value response = sendRequest(drogon::Delete, "/users/" + std::to_string(userIdToDelete), Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["message"].asString(), AppConstants::MSG_USER_DELETED);

    // Verify user is gone
    response = sendRequest(drogon::Get, "/users/" + std::to_string(userIdToDelete), Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 404);
}

TEST_F(UserApiTest, UserCannotDeleteUser) {
    Json::Value response = sendRequest(drogon::Delete, "/users/" + std::to_string(adminUserId), Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
}

TEST_F(UserApiTest, AdminCannotDeleteSelf) {
    Json::Value response = sendRequest(drogon::Delete, "/users/" + std::to_string(adminUserId), Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden (specific message from controller)
}

// Test /api/v1/users/{id}/roles (PUT assign roles)
TEST_F(UserApiTest, AdminCanAssignRolesToUser) {
    Json::Value assign_roles_data;
    assign_roles_data["roles"].append(AppConstants::ROLE_ADMIN); // Make standard user an admin
    assign_roles_data["roles"].append(AppConstants::ROLE_USER);

    Json::Value response = sendRequest(drogon::Put, "/users/" + std::to_string(standardUserId), assign_roles_data, adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_EQ(response["message"].asString(), "Roles assigned successfully.");

    // Verify roles
    response = sendRequest(drogon::Get, "/users/" + std::to_string(standardUserId) + "/roles", Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_TRUE(response["data"].isArray());
    ASSERT_EQ(response["data"].size(), 2);
    ASSERT_TRUE(response["data"][0].asString() == AppConstants::ROLE_ADMIN || response["data"][1].asString() == AppConstants::ROLE_ADMIN);
}

TEST_F(UserApiTest, UserCannotAssignRoles) {
    Json::Value assign_roles_data;
    assign_roles_data["roles"].append(AppConstants::ROLE_ADMIN);
    Json::Value response = sendRequest(drogon::Put, "/users/" + std::to_string(standardUserId), assign_roles_data, userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
}

// Test /api/v1/users/{id}/roles (GET user roles)
TEST_F(UserApiTest, AdminCanGetUserRoles) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(standardUserId) + "/roles", Json::Value(), adminToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_TRUE(response["data"].isArray());
    ASSERT_GT(response["data"].size(), 0);
}

TEST_F(UserApiTest, UserCanGetSelfRoles) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(standardUserId) + "/roles", Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 200);
    ASSERT_TRUE(response["data"].isArray());
    ASSERT_GT(response["data"].size(), 0);
}

TEST_F(UserApiTest, UserCannotGetOtherUserRoles) {
    Json::Value response = sendRequest(drogon::Get, "/users/" + std::to_string(adminUserId) + "/roles", Json::Value(), userToken);
    ASSERT_EQ(response["status"].asInt(), 403); // Forbidden
}
```