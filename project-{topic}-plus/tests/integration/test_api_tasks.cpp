#include <gtest/gtest.h>
#include <pistache/http_client.h>
#include "src/app.h"
#include "src/config/config.h"
#include "src/utils/logger.h"
#include "src/utils/json_util.h"
#include <chrono>
#include <thread>
#include <future> // For std::async and std::future

// This test suite will start a full instance of the API server.
// It will run as part of `make run_tests`.
// The server needs to be initialized with a test database.

// Global application instance
std::unique_ptr<Application> test_app;
// Flag to indicate if the server is ready
std::atomic<bool> server_ready(false);
// Store an admin token and user token for API tests
std::string admin_token;
std::string user_token;
long regular_user_id;

void start_test_server() {
    // Set environment variables for the test server
    #ifdef _WIN32
        _putenv_s("APP_PORT", "9081"); // Use a different port for tests
        _putenv_s("DATABASE_PATH", "./data/test_api.db");
        _putenv_s("JWT_SECRET", "test_api_jwt_secret");
        _putenv_s("JWT_EXPIRATION_SECONDS", "3600");
        _putenv_s("DEFAULT_ADMIN_USERNAME", "testadmin");
        _putenv_s("DEFAULT_ADMIN_PASSWORD", "testadminpass");
    #else
        setenv("APP_PORT", "9081", 1);
        setenv("DATABASE_PATH", "./data/test_api.db", 1);
        setenv("JWT_SECRET", "test_api_jwt_secret", 1);
        setenv("JWT_EXPIRATION_SECONDS", "3600", 1);
        setenv("DEFAULT_ADMIN_USERNAME", "testadmin", 1);
        setenv("DEFAULT_ADMIN_PASSWORD", "testadminpass", 1);
    #endif

    Logger::Logger::getInstance().init("./logs/test_api.log", Logger::Level::WARN);
    
    test_app = std::make_unique<Application>();

    try {
        test_app->run_migrations();
        test_app->run_seeders(); // Seeds admin user
        test_app->init();
        server_ready = true; // Signal that server is ready
        test_app->start_server(); // This blocks until shutdown
    } catch (const std::exception& e) {
        LOG_ERROR("Test API Server failed to start: " + std::string(e.what()));
        server_ready = false;
        FAIL() << "Test API Server failed to start: " << e.what();
    }
}

// Fixture for API tests
class ApiIntegrationTest : public ::testing::Test {
protected:
    Pistache::Http::Client client;
    const std::string base_url = "http://localhost:9081";

    void SetUp() override {
        // Wait for the server to be ready
        if (!server_ready) {
            FAIL() << "Test API server did not start successfully.";
        }

        client.init();

        // 1. Get Admin Token
        Json::Value admin_login_payload;
        admin_login_payload["username"] = "testadmin";
        admin_login_payload["password"] = "testadminpass";

        auto admin_response = client.post(base_url + "/auth/login").body(JsonUtil::to_string(admin_login_payload)).send().get();
        ASSERT_EQ(admin_response.code(), Pistache::Http::Code::Ok);
        std::optional<Json::Value> admin_json = JsonUtil::parse_json(admin_response.body());
        ASSERT_TRUE(admin_json);
        admin_token = JsonUtil::get_string(*admin_json, "token");
        ASSERT_FALSE(admin_token.empty());

        // 2. Register and Login a regular user to get their token
        Json::Value register_payload;
        register_payload["username"] = "testuser";
        register_payload["password"] = "testuserpass";
        register_payload["role"] = "user";
        
        // This might fail if user already exists from a previous run, so handle gracefully
        auto register_response = client.post(base_url + "/auth/register").body(JsonUtil::to_string(register_payload)).send().get();
        if (register_response.code() == Pistache::Http::Code::Conflict) {
            LOG_WARN("Test user 'testuser' already exists. Proceeding with login.");
        } else {
            ASSERT_EQ(register_response.code(), Pistache::Http::Code::Created);
        }
        
        auto user_login_response = client.post(base_url + "/auth/login").body(JsonUtil::to_string(register_payload)).send().get();
        ASSERT_EQ(user_login_response.code(), Pistache::Http::Code::Ok);
        std::optional<Json::Value> user_json = JsonUtil::parse_json(user_login_response.body());
        ASSERT_TRUE(user_json);
        user_token = JsonUtil::get_string(*user_json, "token");
        ASSERT_FALSE(user_token.empty());

        // Extract user_id for regular user
        AuthService auth_service_temp;
        std::optional<JwtPayload> payload = auth_service_temp.verify_token(user_token);
        ASSERT_TRUE(payload);
        regular_user_id = payload->user_id;

        // Clear any existing tasks for the testuser if any
        test_app->run_migrations(); // Re-run to clear tables for fresh start if needed, or simply delete tasks.
        DatabaseManager::getInstance().execute("DELETE FROM tasks WHERE user_id = (SELECT id FROM users WHERE username = 'testuser');");
    }

    void TearDown() override {
        client.shutdown();
        // Database cleanup for tasks created by test user and admin tasks that might be created
        DatabaseManager::getInstance().execute("DELETE FROM tasks;");
        DatabaseManager::getInstance().execute("DELETE FROM users WHERE username = 'testuser';");
    }
};

// Global setup and teardown for the entire test executable
void setup_global_test_environment() {
    // Start the server in a separate thread
    std::thread server_thread(start_test_server);
    server_thread.detach(); // Detach to let it run in background

    // Wait for the server to signal readiness, with a timeout
    int timeout_seconds = 10;
    for (int i = 0; i < timeout_seconds * 10 && !server_ready; ++i) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    if (!server_ready) {
        FAIL() << "Test server failed to become ready within " << timeout_seconds << " seconds.";
    }
}

void teardown_global_test_environment() {
    if (test_app) {
        test_app->api_server_->shutdown(); // Request server to shut down
        // It might take a moment for the server thread to finish
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    // Clean up test database file directly
    std::string test_db_path = "./data/test_api.db";
    std::remove(test_db_path.c_str());
    LOG_INFO("Global test environment torn down.");
}

// GTest global event listener
class GlobalTestEnvironment : public ::testing::Environment {
public:
    void SetUp() override {
        setup_global_test_environment();
    }
    void TearDown() override {
        teardown_global_test_environment();
    }
};

// Register the global environment
[[maybe_unused]] testing::Environment* const env = ::testing::AddGlobalTestEnvironment(new GlobalTestEnvironment);


// --- API Test Cases ---

TEST_F(ApiIntegrationTest, AuthRegisterAndLogin) {
    // Test registration of a new user
    Json::Value register_payload;
    register_payload["username"] = "newuser";
    register_payload["password"] = "newpass123";
    register_payload["role"] = "user";

    auto response = client.post(base_url + "/auth/register").body(JsonUtil::to_string(register_payload)).send().get();
    ASSERT_EQ(response.code(), Pistache::Http::Code::Created);
    std::optional<Json::Value> json_resp = JsonUtil::parse_json(response.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "status"), "success");
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "user", "username"), "newuser");

    // Test login with the new user
    Json::Value login_payload;
    login_payload["username"] = "newuser";
    login_payload["password"] = "newpass123";

    response = client.post(base_url + "/auth/login").body(JsonUtil::to_string(login_payload)).send().get();
    ASSERT_EQ(response.code(), Pistache::Http::Code::Ok);
    json_resp = JsonUtil::parse_json(response.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "status"), "success");
    ASSERT_FALSE(JsonUtil::get_string(*json_resp, "token").empty());

    // Clean up testuser
    DatabaseManager::getInstance().execute("DELETE FROM users WHERE username = 'newuser';");
}

TEST_F(ApiIntegrationTest, TasksCreateAndRetrieveAsUser) {
    Json::Value create_task_payload;
    create_task_payload["title"] = "User Task 1";
    create_task_payload["description"] = "Description for user task 1";
    create_task_payload["status"] = "pending";
    create_task_payload["due_date"] = "2023-12-25";

    // Create task as regular user
    auto response = client.post(base_url + "/tasks")
                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                        .body(JsonUtil::to_string(create_task_payload))
                        .send().get();
    ASSERT_EQ(response.code(), Pistache::Http::Code::Created);
    std::optional<Json::Value> json_resp = JsonUtil::parse_json(response.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "status"), "success");
    long task_id = JsonUtil::get_int(*json_resp, "task", "id");
    ASSERT_GT(task_id, 0);

    // Retrieve single task as regular user (owner)
    response = client.get(base_url + "/tasks/" + std::to_string(task_id))
                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                        .send().get();
    ASSERT_EQ(response.code(), Pistache::Http::Code::Ok);
    json_resp = JsonUtil::parse_json(response.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "status"), "success");
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "data", "title"), "User Task 1");
    ASSERT_EQ(JsonUtil::get_int(*json_resp, "data", "user_id"), regular_user_id);

    // Retrieve all tasks as regular user (should only see their own)
    response = client.get(base_url + "/tasks")
                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                        .send().get();
    ASSERT_EQ(response.code(), Pistache::Http::Code::Ok);
    json_resp = JsonUtil::parse_json(response.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "status"), "success");
    ASSERT_TRUE(json_resp->isMember("data") && json_resp->at("data").isArray());
    ASSERT_EQ(json_resp->at("data").size(), 1);
    ASSERT_EQ(JsonUtil::get_string(json_resp->at("data")[0], "title"), "User Task 1");
}

TEST_F(ApiIntegrationTest, TasksAuthorization) {
    // Create a task as admin
    Json::Value create_task_payload;
    create_task_payload["title"] = "Admin Task";
    create_task_payload["description"] = "Admin only task";
    create_task_payload["due_date"] = "2023-12-31";
    
    auto admin_create_response = client.post(base_url + "/tasks")
                                    .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + admin_token))
                                    .body(JsonUtil::to_string(create_task_payload))
                                    .send().get();
    ASSERT_EQ(admin_create_response.code(), Pistache::Http::Code::Created);
    std::optional<Json::Value> admin_json_resp = JsonUtil::parse_json(admin_create_response.body());
    ASSERT_TRUE(admin_json_resp);
    long admin_task_id = JsonUtil::get_int(*admin_json_resp, "task", "id");

    // Try to retrieve admin task as regular user (should be forbidden)
    auto user_get_response = client.get(base_url + "/tasks/" + std::to_string(admin_task_id))
                                .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                .send().get();
    ASSERT_EQ(user_get_response.code(), Pistache::Http::Code::Forbidden);

    // Admin should be able to see all tasks (including user's and own)
    Json::Value user_task_payload;
    user_task_payload["title"] = "Another User Task";
    user_task_payload["description"] = "For user to own";
    user_task_payload["due_date"] = "2023-12-20";
    client.post(base_url + "/tasks")
        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
        .body(JsonUtil::to_string(user_task_payload))
        .send().get();

    auto admin_get_all_response = client.get(base_url + "/tasks")
                                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + admin_token))
                                        .send().get();
    ASSERT_EQ(admin_get_all_response.code(), Pistache::Http::Code::Ok);
    std::optional<Json::Value> admin_get_all_json = JsonUtil::parse_json(admin_get_all_response.body());
    ASSERT_TRUE(admin_get_all_json);
    ASSERT_TRUE(admin_get_all_json->isMember("data") && admin_get_all_json->at("data").isArray());
    ASSERT_EQ(admin_get_all_json->at("data").size(), 2); // Admin's task + user's task

    // Admin should be able to delete any task
    auto admin_delete_response = client.del(base_url + "/tasks/" + std::to_string(admin_task_id))
                                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + admin_token))
                                        .send().get();
    ASSERT_EQ(admin_delete_response.code(), Pistache::Http::Code::Ok);
}

TEST_F(ApiIntegrationTest, TasksUpdateAndNotFound) {
    Json::Value create_task_payload;
    create_task_payload["title"] = "Task to Update";
    create_task_payload["description"] = "Original Description";
    create_task_payload["status"] = "pending";
    create_task_payload["due_date"] = "2024-01-01";

    auto create_response = client.post(base_url + "/tasks")
                                .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                .body(JsonUtil::to_string(create_task_payload))
                                .send().get();
    ASSERT_EQ(create_response.code(), Pistache::Http::Code::Created);
    std::optional<Json::Value> create_json = JsonUtil::parse_json(create_response.body());
    ASSERT_TRUE(create_json);
    long task_id = JsonUtil::get_int(*create_json, "task", "id");

    Json::Value update_task_payload;
    update_task_payload["title"] = "Updated Title";
    update_task_payload["status"] = "completed";

    // Update task as owner
    auto update_response = client.put(base_url + "/tasks/" + std::to_string(task_id))
                                .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                .body(JsonUtil::to_string(update_task_payload))
                                .send().get();
    ASSERT_EQ(update_response.code(), Pistache::Http::Code::Ok);
    std::optional<Json::Value> update_json = JsonUtil::parse_json(update_response.body());
    ASSERT_TRUE(update_json);
    ASSERT_EQ(JsonUtil::get_string(*update_json, "task", "title"), "Updated Title");
    ASSERT_EQ(JsonUtil::get_string(*update_json, "task", "status"), "completed");
    ASSERT_EQ(JsonUtil::get_string(*update_json, "task", "description"), "Original Description"); // Description unchanged

    // Try to update a non-existent task
    auto non_existent_update_response = client.put(base_url + "/tasks/9999")
                                            .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                            .body(JsonUtil::to_string(update_task_payload))
                                            .send().get();
    ASSERT_EQ(non_existent_update_response.code(), Pistache::Http::Code::NotFound);

    // Try to get a non-existent task
    auto non_existent_get_response = client.get(base_url + "/tasks/9999")
                                        .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                        .send().get();
    ASSERT_EQ(non_existent_get_response.code(), Pistache::Http::Code::NotFound);
}

TEST_F(ApiIntegrationTest, RateLimiting) {
    // This test might be flaky depending on exact timing and server load.
    // It's a conceptual test to show the rate limiter's presence.
    int limit = Config::RATE_LIMIT_MAX_REQUESTS; // Get from config
    int window = Config::RATE_LIMIT_WINDOW_SECONDS; // Get from config

    // Make `limit` requests successfully
    for (int i = 0; i < limit; ++i) {
        auto response = client.get(base_url + "/tasks")
                            .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                            .send().get();
        ASSERT_EQ(response.code(), Pistache::Http::Code::Ok) << "Request " << i+1 << " failed within limit.";
    }

    // The next request should be rate-limited
    auto response_too_many = client.get(base_url + "/tasks")
                                .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                .send().get();
    ASSERT_EQ(response_too_many.code(), Pistache::Http::Code::Forbidden);
    std::optional<Json::Value> json_resp = JsonUtil::parse_json(response_too_many.body());
    ASSERT_TRUE(json_resp);
    ASSERT_EQ(JsonUtil::get_string(*json_resp, "message"), "Too many requests. Please try again later.");

    // Wait for the window to reset
    LOG_INFO("Waiting for rate limit window to reset (" + std::to_string(window + 1) + " seconds)...");
    std::this_thread::sleep_for(std::chrono::seconds(window + 1));

    // After reset, request should succeed again
    auto response_after_reset = client.get(base_url + "/tasks")
                                    .header<Pistache::Http::Header::Authorization>(Pistache::Http::Header::Authorization("Bearer " + user_token))
                                    .send().get();
    ASSERT_EQ(response_after_reset.code(), Pistache::Http::Code::Ok);
}
```