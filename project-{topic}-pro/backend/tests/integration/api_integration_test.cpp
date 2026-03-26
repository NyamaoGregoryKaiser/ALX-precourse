#include "gtest/gtest.h"
#include "../../src/main.cpp" // Include main to start server, or mock server
#include <httplib.h> // A lightweight HTTP client library for testing
#include <thread>
#include <chrono>

// NOTE: Running a real server in a test suite can be tricky.
// You might need to:
// 1. Run the server in a separate thread.
// 2. Ensure tests don't interfere (e.g., using different ports, or mock server).
// 3. For true API tests, deploy the service and run tests against it.

// Mock main function to run server on a specific port for testing
void run_test_server(int port, const std::string& db_conn_str, std::atomic<bool>& server_ready) {
    spdlog::set_level(spdlog::level::off); // Suppress server logs during test

    // Simulate main.cpp logic, but use test DB and a specific port
    Config::load_env("../.env.example"); // Load configuration
    Config::env_vars["APP_PORT"] = std::to_string(port);
    Config::env_vars["DATABASE_URL"] = db_conn_str;
    Config::env_vars["JWT_SECRET"] = "api_test_secret_key"; // Use a specific secret for tests

    UserRepository userRepo(Config::get_string("DATABASE_URL"));
    UserService userService(userRepo);
    ContentRepository contentRepo(Config::get_string("DATABASE_URL"));
    ContentService contentService(contentRepo);
    JWTManager jwtManager(Config::get_string("JWT_SECRET"));

    AuthController authController(userService, jwtManager);
    UserController userController(userService);
    ContentController contentController(contentService);

    CMS_Server server_instance(port, 1);
    server_instance.add_middleware(RequestLoggerMiddleware::log_request);
    server_instance.add_middleware(ErrorHandlingMiddleware::handle_exceptions);
    server_instance.add_auth_middleware([&jwtManager](const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        AuthMiddleware::authenticate(req, resp, next, jwtManager);
    });

    authController.setup_routes(server_instance);
    userController.setup_routes(server_instance);
    contentController.setup_routes(server_instance);

    server_ready = true; // Signal that server is ready
    server_instance.start(); // This will block until server_instance.shutdown() is called
}

class ApiIntegrationTest : public Test {
protected:
    httplib::Client* client;
    std::thread* server_thread;
    std::atomic<bool> server_ready;
    const int TEST_PORT = 9081;
    std::string test_db_conn_str;
    JWTManager* jwt_manager_for_tests; // To generate tokens for authenticated requests

    ApiIntegrationTest() : server_ready(false) {
        // Suppress spdlog output during tests if needed
        spdlog::set_level(spdlog::level::off);
    }

    void SetUp() override {
        // Ensure test database exists and is clean (similar to UserRepositoryIntegrationTest)
        test_db_conn_str = "postgresql://user:password@localhost:5432/cms_api_test_db";
        try {
            pqxx::connection C_admin("postgresql://user:password@localhost:5432/postgres");
            pqxx::work W_admin(C_admin);
            W_admin.exec("DROP DATABASE IF EXISTS cms_api_test_db WITH (FORCE);");
            W_admin.exec("CREATE DATABASE cms_api_test_db;");
            W_admin.commit();

            pqxx::connection C_test(test_db_conn_str);
            pqxx::work W_test(C_test);
            std::ifstream schema_file("../database/schema/001_initial_schema.sql");
            std::stringstream buffer;
            buffer << schema_file.rdbuf();
            W_test.exec(buffer.str());
            W_test.commit();
            
            // Seed data for API tests
            std::ifstream seed_file("../database/seed/seed_data.sql");
            std::stringstream seed_buffer;
            seed_buffer << seed_file.rdbuf();
            W_test.exec(seed_buffer.str());
            W_test.commit();
            spdlog::info("API Test database 'cms_api_test_db' setup and seeded.");

        } catch (const std::exception& e) {
            FAIL() << "Failed to setup API test database: " << e.what();
        }

        server_thread = new std::thread(run_test_server, TEST_PORT, test_db_conn_str, std::ref(server_ready));

        // Wait for the server to be ready (with a timeout)
        auto start_time = std::chrono::high_resolution_clock::now();
        while (!server_ready && std::chrono::duration_cast<std::chrono::seconds>(std::chrono::high_resolution_clock::now() - start_time).count() < 10) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        if (!server_ready) {
            FAIL() << "Test server failed to start within timeout.";
        }
        
        client = new httplib::Client("localhost", TEST_PORT);
        jwt_manager_for_tests = new JWTManager("api_test_secret_key");
    }

    void TearDown() override {
        // Ideally, CMS_Server needs a way to stop gracefully from another thread.
        // For simplicity, we just detach the thread or let it end with the process.
        // In a production-grade test setup, you'd send a shutdown signal to the server.
        // If server_instance.start() is blocking, then you need a way to call shutdown().
        // For this example, we assume `serveThreaded()` is used and the thread detaches.
        // The current `main.cpp` uses `serveThreaded` and detaching the thread would be the way.
        // For proper shutdown, CMS_Server would need a `stop()` method to call `http_endpoint->shutdown()`.
        if (server_thread && server_thread->joinable()) {
             // Need a mechanism to stop the server gracefully, e.g., a global shutdown flag
             // or a dedicated /shutdown endpoint for tests.
             // For now, let's assume it will clean up when the process exits.
            server_thread->detach();
        }
        delete client;
        delete server_thread;
        delete jwt_manager_for_tests;

        // Clean up: drop the test database
        try {
            pqxx::connection C_admin("postgresql://user:password@localhost:5432/postgres");
            pqxx::work W_admin(C_admin);
            W_admin.exec("DROP DATABASE IF EXISTS cms_api_test_db WITH (FORCE);");
            W_admin.commit();
        } catch (const std::exception& e) {
            spdlog::error("Error tearing down API test database: {}", e.what());
        }
    }
};

TEST_F(ApiIntegrationTest, RegisterUser_Success) {
    nlohmann::json user_data = {
        {"username", "api_newuser"},
        {"email", "api_new@example.com"},
        {"password", "ApiSecurePassword123"}
    };
    auto res = client->Post("/auth/register", user_data.dump(), "application/json");

    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 201); // Created
    nlohmann::json response_body = nlohmann::json::parse(res->body);
    EXPECT_EQ(response_body["username"], "api_newuser");
    EXPECT_TRUE(response_body.count("id"));
}

TEST_F(ApiIntegrationTest, LoginUser_Success) {
    nlohmann::json login_data = {
        {"email", "admin@example.com"}, // From seed_data
        {"password", "password123"}
    };
    auto res = client->Post("/auth/login", login_data.dump(), "application/json");

    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 200); // OK
    nlohmann::json response_body = nlohmann::json::parse(res->body);
    EXPECT_TRUE(response_body.count("token"));
    EXPECT_EQ(response_body["username"], "adminuser");
    EXPECT_EQ(response_body["role"], "admin");
}

TEST_F(ApiIntegrationTest, LoginUser_InvalidCredentials) {
    nlohmann::json login_data = {
        {"email", "admin@example.com"},
        {"password", "wrong_password"}
    };
    auto res = client->Post("/auth/login", login_data.dump(), "application/json");

    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 401); // Unauthorized
}

TEST_F(ApiIntegrationTest, GetUsers_Unauthorized) {
    // Attempt to access a protected route without a token
    auto res = client->Get("/users");
    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 401); // Unauthorized
}

TEST_F(ApiIntegrationTest, GetUsers_AuthorizedAdmin) {
    // First, login to get a token
    nlohmann::json login_data = {{"email", "admin@example.com"}, {"password", "password123"}};
    auto login_res = client->Post("/auth/login", login_data.dump(), "application/json");
    ASSERT_TRUE(login_res != nullptr);
    std::string admin_token = nlohmann::json::parse(login_res->body)["token"];

    // Now, make an authenticated request
    httplib::Headers headers = {{"Authorization", "Bearer " + admin_token}};
    auto res = client->Get("/users", headers);

    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 200); // OK
    nlohmann::json response_body = nlohmann::json::parse(res->body);
    ASSERT_TRUE(response_body.is_array());
    EXPECT_GE(response_body.size(), 3); // Check against seed data
    EXPECT_EQ(response_body[0]["username"], "adminuser");
}

TEST_F(ApiIntegrationTest, CreateContent_AuthorizedEditor) {
    // Login as editor
    nlohmann::json login_data = {{"email", "editor@example.com"}, {"password", "password123"}};
    auto login_res = client->Post("/auth/login", login_data.dump(), "application/json");
    ASSERT_TRUE(login_res != nullptr);
    std::string editor_token = nlohmann::json::parse(login_res->body)["token"];
    long long editor_id = nlohmann::json::parse(login_res->body)["userId"];

    nlohmann::json content_data = {
        {"title", "My New Article"},
        {"slug", "my-new-article"},
        {"body", "This is the content of my new article."},
        {"summary", "A brief summary."},
        {"status", "draft"},
        {"type", "post"},
        {"authorId", editor_id} // Author ID should match logged-in user or be set by backend
        // categoryId could be added
    };

    httplib::Headers headers = {{"Authorization", "Bearer " + editor_token}};
    auto res = client->Post("/content", headers, content_data.dump(), "application/json");

    ASSERT_TRUE(res != nullptr);
    EXPECT_EQ(res->status, 201); // Created
    nlohmann::json response_body = nlohmann::json::parse(res->body);
    EXPECT_EQ(response_body["title"], "My New Article");
    EXPECT_TRUE(response_body.count("id"));
}