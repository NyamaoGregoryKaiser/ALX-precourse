```cpp
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include <json/json.h>
#include <iostream>
#include <thread>
#include <chrono>

// Global setup/teardown for the Drogon app
class DrogonTestEnvironment : public ::testing::Environment {
public:
    void SetUp() override {
        // Ensure Drogon app is not already running or init'd in other tests
        // This is tricky with Drogon's global app() instance.
        // For real integration tests, run the app in a separate process or Docker container.
        // For this example, we'll try to start/stop the app.
        // In a complex app, you might use `drogon::app().reInit()` or similar.
        
        std::cout << "Starting Drogon app for integration tests..." << std::endl;
        // In a real scenario, this would ideally run in a separate thread
        // or the server would be started externally (e.g., via docker-compose)
        // and tests would connect to it.
        // For this demo, we assume Drogon app is externally managed (e.g. by docker-compose)
        // or setup to run on a specific port.
        
        // Ensure DB is seeded and ready
        // (Handled by docker-compose healthcheck and seed.sql)
        // For direct C++ execution, you would connect to DB and run seed scripts here.
    }

    void TearDown() override {
        std::cout << "Tearing down Drogon test environment (shutting down app if running)..." << std::endl;
        // drogon::app().quit(); // If running in-process, stop it
        // This is complex for a multi-test-suite environment.
        // Best practice is to run Drogon once externally and connect.
    }
};

// Register our environment
// static ::testing::Environment* const env = ::testing::AddGlobalTestEnvironment(new DrogonTestEnvironment);

// Base URL for the API
const std::string BASE_URL = "http://127.0.0.1:8080/api/v1";

TEST(AuthAPIIntegrationTest, LoginSuccess) {
    auto client = drogon::HttpClient::newHttpClient(BASE_URL);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Post);
    req->setPath("/login");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value loginPayload;
    loginPayload["email"] = "admin@example.com";
    loginPayload["password"] = "password123"; // This needs to match the seeded hash logic
    req->setBody(loginPayload.toStyledString());

    auto [resp, err] = client->sendRequest(req);

    ASSERT_EQ(err, drogon::ReqResult::kOk);
    ASSERT_TRUE(resp != nullptr);
    ASSERT_EQ(resp->getStatusCode(), drogon::k200OK);

    Json::CharReaderBuilder builder;
    Json::Value jsonResp;
    std::string errs;
    std::istringstream sstream(resp->getBody());
    Json::parseFromStream(builder, sstream, &jsonResp, &errs);

    ASSERT_TRUE(jsonResp.isMember("token"));
    ASSERT_FALSE(jsonResp["token"].asString().empty());
    ASSERT_TRUE(jsonResp.isMember("user"));
    ASSERT_EQ(jsonResp["user"]["email"].asString(), "admin@example.com");
}

TEST(AuthAPIIntegrationTest, LoginFailureInvalidCredentials) {
    auto client = drogon::HttpClient::newHttpClient(BASE_URL);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Post);
    req->setPath("/login");
    req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value loginPayload;
    loginPayload["email"] = "admin@example.com";
    loginPayload["password"] = "wrongpassword"; // Incorrect password
    req->setBody(loginPayload.toStyledString());

    auto [resp, err] = client->sendRequest(req);

    ASSERT_EQ(err, drogon::ReqResult::kOk);
    ASSERT_TRUE(resp != nullptr);
    ASSERT_EQ(resp->getStatusCode(), drogon::k401Unauthorized);

    Json::CharReaderBuilder builder;
    Json::Value jsonResp;
    std::string errs;
    std::istringstream sstream(resp->getBody());
    Json::parseFromStream(builder, sstream, &jsonResp, &errs);
    ASSERT_TRUE(jsonResp.isMember("error"));
    ASSERT_EQ(jsonResp["error"].asString(), "Invalid credentials");
}

TEST(AuthAPIIntegrationTest, AccessProtectedEndpointWithoutToken) {
    auto client = drogon::HttpClient::newHttpClient(BASE_URL);
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Get);
    req->setPath("/users"); // A protected endpoint
    
    auto [resp, err] = client->sendRequest(req);

    ASSERT_EQ(err, drogon::ReqResult::kOk);
    ASSERT_TRUE(resp != nullptr);
    ASSERT_EQ(resp->getStatusCode(), drogon::k401Unauthorized);

    Json::CharReaderBuilder builder;
    Json::Value jsonResp;
    std::string errs;
    std::istringstream sstream(resp->getBody());
    Json::parseFromStream(builder, sstream, &jsonResp, &errs);
    ASSERT_TRUE(jsonResp.isMember("error"));
    ASSERT_EQ(jsonResp["error"].asString(), "Authorization token missing");
}

TEST(AuthAPIIntegrationTest, AccessProtectedEndpointWithValidToken) {
    // First, login to get a valid token
    auto loginClient = drogon::HttpClient::newHttpClient(BASE_URL);
    auto loginReq = drogon::HttpRequest::newHttpRequest();
    loginReq->setMethod(drogon::Post);
    loginReq->setPath("/login");
    loginReq->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value loginPayload;
    loginPayload["email"] = "admin@example.com";
    loginPayload["password"] = "password123";
    loginReq->setBody(loginPayload.toStyledString());

    auto [loginResp, loginErr] = loginClient->sendRequest(loginReq);
    ASSERT_EQ(loginErr, drogon::ReqResult::kOk);
    ASSERT_TRUE(loginResp != nullptr);
    ASSERT_EQ(loginResp->getStatusCode(), drogon::k200OK);

    Json::CharReaderBuilder builder;
    Json::Value loginJson;
    std::string errs;
    std::istringstream sstream(loginResp->getBody());
    Json::parseFromStream(builder, sstream, &loginJson, &errs);
    std::string token = loginJson["token"].asString();
    ASSERT_FALSE(token.empty());

    // Now, use the token to access a protected endpoint
    auto protectedClient = drogon::HttpClient::newHttpClient(BASE_URL);
    auto protectedReq = drogon::HttpRequest::newHttpRequest();
    protectedReq->setMethod(drogon::Get);
    protectedReq->setPath("/users");
    protectedReq->addHeader("Authorization", "Bearer " + token);

    auto [protectedResp, protectedErr] = protectedClient->sendRequest(protectedReq);

    ASSERT_EQ(protectedErr, drogon::ReqResult::kOk);
    ASSERT_TRUE(protectedResp != nullptr);
    ASSERT_EQ(protectedResp->getStatusCode(), drogon::k200OK);

    Json::Value usersJson;
    std::istringstream sstream2(protectedResp->getBody());
    Json::parseFromStream(builder, sstream2, &usersJson, &errs);
    ASSERT_TRUE(usersJson.isArray());
    ASSERT_FALSE(usersJson.empty()); // Should return at least the admin user
}
```