```cpp
#include <gtest/gtest.h>
#include <crow.h>
#include <json/json.hpp>
#include "../../src/server/Server.h"
#include "../../src/config/AppConfig.h"
#include "../../src/database/Database.h"
#include "../../src/cache/Cache.h"
#include "../../src/utils/Logger.h"
#include <filesystem>
#include <thread>
#include <chrono>

namespace fs = std::filesystem;

// A custom test fixture to set up and tear down the server for integration tests
class APIServerTest : public ::testing::Test {
protected:
    TaskManager::Config::AppConfig& config = TaskManager::Config::AppConfig::getInstance();
    TaskManager::Database::Database& db = TaskManager::Database::Database::getInstance();
    TaskManager::Cache::Cache& cache = TaskManager::Cache::Cache::getInstance();
    
    // Use a unique database file for each test run
    std::string test_db_path = "integration_test_db.db";
    std::string original_db_path;
    std::string original_jwt_secret;
    std::string original_log_level;

    std::shared_ptr<TaskManager::Server::ApiServer> api_server; // Use shared_ptr for easier management

    // Crow App instance to simulate requests against (without actually running the server on a port)
    crow::App<
        TaskManager::Middleware::ErrorHandlingMiddleware,
        TaskManager::Middleware::AuthMiddleware,
        TaskManager::Middleware::RateLimitingMiddleware
    > test_app;

    void SetUp() override {
        // Redirect logs to avoid cluttering test output
        TaskManager::Utils::Logger::init("off");

        // Load configuration and override for testing
        config.load(".env.example");
        original_db_path = config.get("DATABASE_PATH");
        original_jwt_secret = config.get("JWT_SECRET");
        original_log_level = config.get("LOG_LEVEL");

        config.get("DATABASE_PATH") = test_db_path;
        config.get("JWT_SECRET") = "test_secret"; // Use a predictable secret for testing
        config.get("LOG_LEVEL") = "critical"; // Minimize test output

        // Clean up previous test DB
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }

        // Connect DB and apply schema/seed for testing
        db.connect(test_db_path);
        std::ifstream schema_file("db/schema.sql");
        std::stringstream buffer;
        buffer << schema_file.rdbuf();
        db.execute(buffer.str());
        schema_file.close();

        std::ifstream seed_file("db/seed.sql");
        std::stringstream seed_buffer;
        seed_buffer << seed_file.rdbuf();
        db.execute(seed_buffer.str());
        seed_file.close();

        cache.init(1); // Short TTL for integration tests

        // Re-initialize the server components with the test config
        // This is a bit tricky with Crow's app lifecycle. The best way to mock Crow is not via a running server.
        // Instead, we directly instantiate controllers and pass a Crow app to their setupRoutes.
        // This simulates a "mock server" where routes are registered but not bound to a port.
        // Then we can use `test_app.validate()` and `test_app.handle_request()` to hit routes directly.
        
        // This approach requires instantiating the services and middleware directly for `test_app`
        // and then calling setupRoutes on the controllers with `test_app`.
        // This part is conceptually complex for a single response, so I'll simplify `api_server` creation.

        // Instead of ApiServer, we create the components it uses.
        // This setup is for using test_app.handle_request directly.
        // Initialize services
        user_service_ = std::make_unique<TaskManager::Services::UserService>(db, cache);
        project_service_ = std::make_unique<TaskManager::Services::ProjectService>(db, cache);
        task_service_ = std::make_unique<TaskManager::Services::TaskService>(db, cache);
        auth_service_ = std::make_unique<TaskManager::Services::AuthService>(*user_service_, config);

        // Initialize controllers
        auth_controller_ = std::make_unique<TaskManager::Controllers::AuthController>(*auth_service_, *user_service_);
        user_controller_ = std::make_unique<TaskManager::Controllers::UserController>(*user_service_);
        project_controller_ = std::make_unique<TaskManager::Controllers::ProjectController>(*project_service_, *user_service_);
        task_controller_ = std::make_unique<TaskManager::Controllers::TaskController>(*task_service_, *project_service_, *user_service_);

        // Set up Crow app middleware (same as ApiServer)
        test_app.middleware<TaskManager::Middleware::ErrorHandlingMiddleware>();
        test_app.middleware<TaskManager::Middleware::AuthMiddleware>(*auth_service_, *user_service_);
        test_app.middleware<TaskManager::Middleware::RateLimitingMiddleware>(config);
        
        // Set up routes on the test app
        CROW_ROUTE(test_app, "/health")
            .methods("GET"_method)
            ([]() { return crow::response(crow::status::OK, "{\"status\": \"healthy\"}"); });
        auth_controller_->setupRoutes(test_app);
        user_controller_->setupRoutes(test_app);
        project_controller_->setupRoutes(test_app);
        task_controller_->setupRoutes(test_app);

        // Validate routes and prepare the Crow app
        test_app.validate();
    }

    void TearDown() override {
        // Restore original config values
        config.get("DATABASE_PATH") = original_db_path;
        config.get("JWT_SECRET") = original_jwt_secret;
        config.get("LOG_LEVEL") = original_log_level;
        
        db.disconnect();
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        cache.clear();

        user_service_.reset();
        project_service_.reset();
        task_service_.reset();
        auth_service_.reset();
        auth_controller_.reset();
        user_controller_.reset();
        project_controller_.reset();
        task_controller_.reset();
        // The Crow app can be tricky to fully reset/destroy, but for testing
        // purposes, a new instance per fixture should suffice conceptually.
    }

    // Services and Controllers for the test app
    std::unique_ptr<TaskManager::Services::UserService> user_service_;
    std::unique_ptr<TaskManager::Services::ProjectService> project_service_;
    std::unique_ptr<TaskManager::Services::TaskService> task_service_;
    std::unique_ptr<TaskManager::Services::AuthService> auth_service_;
    std::unique_ptr<TaskManager::Controllers::AuthController> auth_controller_;
    std::unique_ptr<TaskManager::Controllers::UserController> user_controller_;
    std::unique_ptr<TaskManager::Controllers::ProjectController> project_controller_;
    std::unique_ptr<TaskManager::Controllers::TaskController> task_controller_;
};

TEST_F(APIServerTest, HealthCheck) {
    crow::request req;
    req.method = crow::HTTPMethod::GET;
    req.url = "/health";

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    ASSERT_EQ(res.body, "{\"status\": \"healthy\"}");
}

TEST_F(APIServerTest, RegisterAndLogin) {
    // Register
    crow::request register_req;
    register_req.method = crow::HTTPMethod::POST;
    register_req.url = "/auth/register";
    register_req.body = R"({"username": "newuser", "password": "securepassword", "email": "newuser@example.com"})";
    register_req.add_header("Content-Type", "application/json");

    crow::response register_res;
    test_app.handle_request(register_req, register_res);

    ASSERT_EQ(register_res.code, crow::status::CREATED);
    nlohmann::json register_json = nlohmann::json::parse(register_res.body);
    ASSERT_EQ(register_json["message"], "User registered successfully.");
    ASSERT_EQ(register_json["user"]["username"], "newuser");

    // Login
    crow::request login_req;
    login_req.method = crow::HTTPMethod::POST;
    login_req.url = "/auth/login";
    login_req.body = R"({"username": "newuser", "password": "securepassword"})";
    login_req.add_header("Content-Type", "application/json");

    crow::response login_res;
    test_app.handle_request(login_req, login_res);

    ASSERT_EQ(login_res.code, crow::status::OK);
    nlohmann::json login_json = nlohmann::json::parse(login_res.body);
    ASSERT_TRUE(login_json.contains("token"));
    ASSERT_EQ(login_json["username"], "newuser");
    ASSERT_EQ(login_json["role"], "user");
    
    // Store token for subsequent tests
    login_token = login_json["token"].get<std::string>();
    current_user_id = login_json["user_id"].get<long long>();
}

TEST_F(APIServerTest, LoginFailure) {
    crow::request login_req;
    login_req.method = crow::HTTPMethod::POST;
    login_req.url = "/auth/login";
    login_req.body = R"({"username": "nonexistent", "password": "wrongpassword"})";
    login_req.add_header("Content-Type", "application/json");

    crow::response login_res;
    test_app.handle_request(login_req, login_res);

    ASSERT_EQ(login_res.code, crow::status::UNAUTHORIZED);
    nlohmann::json login_json = nlohmann::json::parse(login_res.body);
    ASSERT_EQ(login_json["error"], "Invalid username or password.");
}

TEST_F(APIServerTest, AuthMeProtected) {
    // Assuming login_token is set from previous successful login
    if (login_token.empty()) {
        RegisterAndLogin(); // Ensure token is available
    }

    crow::request req;
    req.method = crow::HTTPMethod::GET;
    req.url = "/auth/me";
    req.add_header("Authorization", "Bearer " + login_token);

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    nlohmann::json user_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(user_json["username"], "newuser");
    ASSERT_FALSE(user_json.contains("password_hash")); // Should not expose hash
}

TEST_F(APIServerTest, CreateProject) {
    if (login_token.empty()) {
        RegisterAndLogin();
    }

    crow::request req;
    req.method = crow::HTTPMethod::POST;
    req.url = "/projects";
    req.add_header("Authorization", "Bearer " + login_token);
    req.add_header("Content-Type", "application/json");
    req.body = R"({"name": "Test Project", "description": "A project for integration testing."})";

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::CREATED);
    nlohmann::json project_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(project_json["name"], "Test Project");
    ASSERT_EQ(project_json["owner_id"], current_user_id);
    
    current_project_id = project_json["id"].get<long long>();
}

TEST_F(APIServerTest, GetProjectById) {
    if (login_token.empty() || current_project_id == 0) {
        RegisterAndLogin();
        CreateProject();
    }

    crow::request req;
    req.method = crow::HTTPMethod::GET;
    req.url = "/projects/" + std::to_string(current_project_id);
    req.add_header("Authorization", "Bearer " + login_token);

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    nlohmann::json project_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(project_json["id"], current_project_id);
    ASSERT_EQ(project_json["name"], "Test Project");
}

TEST_F(APIServerTest, UpdateProject) {
    if (login_token.empty() || current_project_id == 0) {
        RegisterAndLogin();
        CreateProject();
    }

    crow::request req;
    req.method = crow::HTTPMethod::PUT;
    req.url = "/projects/" + std::to_string(current_project_id);
    req.add_header("Authorization", "Bearer " + login_token);
    req.add_header("Content-Type", "application/json");
    req.body = R"({"name": "Updated Test Project Name"})";

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    nlohmann::json project_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(project_json["name"], "Updated Test Project Name");
}

TEST_F(APIServerTest, CreateTask) {
    if (login_token.empty() || current_project_id == 0) {
        RegisterAndLogin();
        CreateProject();
    }

    crow::request req;
    req.method = crow::HTTPMethod::POST;
    req.url = "/tasks";
    req.add_header("Authorization", "Bearer " + login_token);
    req.add_header("Content-Type", "application/json");
    req.body = R"({"title": "New Task Title", "description": "Description for the task", "project_id": )" + std::to_string(current_project_id) + R"(, "status": "TODO"})";

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::CREATED);
    nlohmann::json task_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(task_json["title"], "New Task Title");
    ASSERT_EQ(task_json["project_id"], current_project_id);
    ASSERT_EQ(task_json["status"], "TODO");

    current_task_id = task_json["id"].get<long long>();
}

TEST_F(APIServerTest, GetTaskById) {
    if (login_token.empty() || current_task_id == 0) {
        RegisterAndLogin();
        CreateProject();
        CreateTask();
    }

    crow::request req;
    req.method = crow::HTTPMethod::GET;
    req.url = "/tasks/" + std::to_string(current_task_id);
    req.add_header("Authorization", "Bearer " + login_token);

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    nlohmann::json task_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(task_json["id"], current_task_id);
    ASSERT_EQ(task_json["title"], "New Task Title");
}

TEST_F(APIServerTest, UpdateTask) {
    if (login_token.empty() || current_task_id == 0) {
        RegisterAndLogin();
        CreateProject();
        CreateTask();
    }

    crow::request req;
    req.method = crow::HTTPMethod::PUT;
    req.url = "/tasks/" + std::to_string(current_task_id);
    req.add_header("Authorization", "Bearer " + login_token);
    req.add_header("Content-Type", "application/json");
    req.body = R"({"status": "IN_PROGRESS", "priority": "HIGH"})";

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::OK);
    nlohmann::json task_json = nlohmann::json::parse(res.body);
    ASSERT_EQ(task_json["status"], "IN_PROGRESS");
    ASSERT_EQ(task_json["priority"], "HIGH");
}

TEST_F(APIServerTest, DeleteTask) {
    if (login_token.empty() || current_task_id == 0) {
        RegisterAndLogin();
        CreateProject();
        CreateTask();
    }

    crow::request req;
    req.method = crow::HTTPMethod::DELETE;
    req.url = "/tasks/" + std::to_string(current_task_id);
    req.add_header("Authorization", "Bearer " + login_token);

    crow::response res;
    test_app.handle_request(req, res);

    ASSERT_EQ(res.code, crow::status::NO_CONTENT);

    // Verify it's deleted
    crow::request get_req;
    get_req.method = crow::HTTPMethod::GET;
    get_req.url = "/tasks/" + std::to_string(current_task_id);
    get_req.add_header("Authorization", "Bearer " + login_token);

    crow::response get_res;
    test_app.handle_request(get_req, get_res);
    ASSERT_EQ(get_res.code, crow::status::NOT_FOUND);
}


// Shared variables for test state
std::string login_token;
long long current_user_id = 0;
long long current_project_id = 0;
long long current_task_id = 0;

```