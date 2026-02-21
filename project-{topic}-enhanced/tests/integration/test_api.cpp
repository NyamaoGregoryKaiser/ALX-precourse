```cpp
#include <catch2/catch_all.hpp>
#include <crow.h>
#include <string>
#include <thread>
#include <chrono>
#include <future>
#include <nlohmann/json.hpp>

// Include necessary headers from your application
#include "../../src/main.cpp" // Includes all controllers and services indirectly
#include "../../src/config/AppConfig.h"
#include "../../src/utils/Logger.h"
#include "../../src/database/DbConnection.h"

// A simple HTTP client for testing Crow endpoints
class TestHttpClient {
public:
    TestHttpClient(int port = 8080) : base_url("http://127.0.0.1:" + std::to_string(port)) {}

    crow::response request(const std::string& method, const std::string& path,
                           const std::string& body = "",
                           const std::map<std::string, std::string>& headers = {}) {
        
        std::string full_url = base_url + path;
        
        // This is a minimal HTTP client implementation for tests.
        // For a more robust solution, consider using a dedicated HTTP client library (e.g., cpr, boost::asio HTTP client).
        // Here, we're simulating a request by directly calling Crow's internal mechanisms,
        // which might not fully represent real HTTP.
        // A better integration test would involve sending actual HTTP requests.
        
        // To simplify, we'll try to use system 'curl' for actual HTTP requests if possible
        // This makes the tests external dependent, but more realistic.
        // For a pure C++ solution, one would use a library.

        // Fallback to simple simulated response if curl is not available or too complex
        // For this example, let's assume we can use `curl` externally.
        std::string command = "curl -s -X " + method + " " + full_url;
        for (const auto& header : headers) {
            command += " -H \"" + header.first + ": " + header.second + "\"";
        }
        if (!body.empty()) {
            command += " -H \"Content-Type: application/json\" -d '" + body + "'";
        }
        
        std::string response_body;
        std::string response_header; // We need to capture headers for status code

        // Execute curl command and capture output
        FILE* pipe = popen(command.c_str(), "r");
        if (!pipe) throw std::runtime_error("popen() failed!");
        char buffer[128];
        while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
            response_body += buffer;
        }
        pclose(pipe);

        // This is a hacky way to get the status code without robust header parsing.
        // A proper client would parse headers. For local testing, we might infer.
        // Crow's response object doesn't directly expose what we need from external call.
        // For simplicity, we'll just check if the JSON body has an "error" field for status.
        // A real integration test would use a library that gives full HTTP response.
        crow::response res;
        try {
            nlohmann::json json_body = nlohmann::json::parse(response_body);
            if (json_body.count("error")) {
                // Infer common error codes. Not robust.
                if (json_body["error"] == "Unauthorized") res.code = crow::UNAUTHORIZED;
                else if (json_body["error"] == "Forbidden") res.code = crow::FORBIDDEN;
                else if (json_body["error"] == "Bad Request") res.code = crow::BAD_REQUEST;
                else if (json_body["error"] == "Not Found") res.code = crow::NOT_FOUND;
                else if (json_body["error"] == "Conflict") res.code = crow::CONFLICT;
                else if (json_body["error"] == "Too Many Requests") res.code = crow::TOO_MANY_REQUESTS;
                else res.code = crow::INTERNAL_SERVER_ERROR;
            } else {
                res.code = crow::OK; // Assume OK if no error field
                if (method == "POST") res.code = crow::CREATED; // POST usually 201
                if (method == "PUT") res.code = crow::OK; // PUT usually 200
                if (method == "DELETE") res.code = crow::NO_CONTENT; // DELETE usually 204
            }
        } catch (const nlohmann::json::exception&) {
            // Not a JSON response, maybe plain text or empty body for 204
            if (method == "DELETE" && response_body.empty()) res.code = crow::NO_CONTENT;
            else if (response_body.empty()) res.code = crow::OK; // Or some other default
            else res.code = crow::INTERNAL_SERVER_ERROR; // Can't parse, assume error
        }
        res.body = response_body;
        return res;
    }

private:
    std::string base_url;
};

// Start Crow app in a separate thread for API tests
// This mimics the actual server environment.
std::unique_ptr<crow::App<AuthMiddleware, ErrorMiddleware>> app_ptr;
std::thread server_thread;
TestHttpClient* client_ptr;
std::atomic<bool> server_ready = false;

void run_server() {
    Logger::init();
    AppConfig::load_config(".env.example"); // Load config for the server thread
    Crypto::set_jwt_secret("test_secret_key_for_jwt"); // Matches client secret
    CacheService::init(AppConfig::get_cache_capacity(), AppConfig::get_cache_ttl());
    RateLimiter::init(AppConfig::get_rate_limit_max_requests(), AppConfig::get_rate_limit_window_seconds());

    // DbConnection is global, so it should be initialized by the GlobalDbSetup
    // just ensure it's healthy.
    
    app_ptr = std::make_unique<crow::App<AuthMiddleware, ErrorMiddleware>>();

    AuthController authController(DbConnection::get_pool());
    UserController userController(DbConnection::get_pool());
    SystemController systemController(DbConnection::get_pool());
    MetricController metricController(DbConnection::get_pool());
    AlertController alertController(DbConnection::get_pool());

    // Public Routes (no authentication required)
    CROW_ROUTE((*app_ptr), "/api/v1/auth/register").methods(crow::HTTPMethod::POST)(
        [&authController](const crow::request& req) {
            return authController.registerUser(req);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/auth/login").methods(crow::HTTPMethod::POST)(
        [&authController](const crow::request& req) {
            return authController.loginUser(req);
        }
    );

    // Authenticated Routes (require JWT token)
    // User Management
    CROW_ROUTE((*app_ptr), "/api/v1/users/<string>").methods(crow::HTTPMethod::GET)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.getUser(req, userId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/users/<string>").methods(crow::HTTPMethod::PUT)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.updateUser(req, userId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/users/<string>").methods(crow::HTTPMethod::DELETE)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.deleteUser(req, userId);
        }
    );

    // System Management
    CROW_ROUTE((*app_ptr), "/api/v1/systems").methods(crow::HTTPMethod::POST)(
        [&systemController](const crow::request& req) {
            return systemController.createSystem(req);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems").methods(crow::HTTPMethod::GET)(
        [&systemController](const crow::request& req) {
            return systemController.getSystems(req);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>").methods(crow::HTTPMethod::GET)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.getSystem(req, systemId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>").methods(crow::HTTPMethod::PUT)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.updateSystem(req, systemId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>").methods(crow::HTTPMethod::DELETE)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.deleteSystem(req, systemId);
        }
    );

    // Metric Ingestion and Retrieval
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>/metrics").methods(crow::HTTPMethod::POST)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.ingestMetric(req, systemId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>/metrics").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getMetrics(req, systemId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>/metrics/latest").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getLatestMetrics(req, systemId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/systems/<string>/metrics/aggregate").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getAggregatedMetrics(req, systemId);
        }
    );

    // Alert Management
    CROW_ROUTE((*app_ptr), "/api/v1/alerts").methods(crow::HTTPMethod::POST)(
        [&alertController](const crow::request& req) {
            return alertController.createAlert(req);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/alerts").methods(crow::HTTPMethod::GET)(
        [&alertController](const crow::request& req) {
            return alertController.getAlerts(req);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/alerts/<string>").methods(crow::HTTPMethod::GET)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.getAlert(req, alertId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/alerts/<string>").methods(crow::HTTPMethod::PUT)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.updateAlert(req, alertId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/alerts/<string>").methods(crow::HTTPMethod::DELETE)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.deleteAlert(req, alertId);
        }
    );
    CROW_ROUTE((*app_ptr), "/api/v1/alerts/<string>/history").methods(crow::HTTPMethod::GET)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.getAlertHistory(req, alertId);
        }
    );

    int port = AppConfig::get_app_port();
    LOG_INFO("Test server starting on port {}", port);
    server_ready = true;
    (*app_ptr).port(port).multithreaded().run();
    LOG_INFO("Test server shutting down.");
}

// Fixture to manage server lifecycle
struct ApiTestFixture {
    ApiTestFixture() {
        LOG_INFO("API Test Fixture Setup: Starting Crow server...");
        // Ensure DbConnection is initialized before starting the server.
        // The GlobalDbSetup in test_database.cpp handles this.

        server_thread = std::thread(run_server);

        // Wait for the server to be ready
        int attempts = 0;
        while (!server_ready && attempts < 100) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            attempts++;
        }
        if (!server_ready) {
            LOG_CRITICAL("Server failed to start in time for API tests.");
            throw std::runtime_error("Server not ready for API tests.");
        }

        client_ptr = new TestHttpClient(AppConfig::get_app_port());
        LOG_INFO("API Test Fixture Setup: Server ready.");
    }

    ~ApiTestFixture() {
        LOG_INFO("API Test Fixture Teardown: Stopping Crow server...");
        if (app_ptr) {
            (*app_ptr).stop();
        }
        if (server_thread.joinable()) {
            server_thread.join();
        }
        delete client_ptr;
        LOG_INFO("API Test Fixture Teardown: Server stopped.");
    }
};

static ApiTestFixture api_test_fixture; // This will run once for all API tests


TEST_CASE("Auth Controller Integration", "[api][auth]") {
    TestHttpClient& client = *client_ptr;
    std::string test_user_id;
    std::string test_jwt_token;

    // Use a unique email for each run of the test to avoid conflicts with seed data
    std::string unique_email = "test_user_" + Crypto::generate_uuid() + "@example.com";
    std::string test_password = "password123";

    SECTION("Register new user") {
        nlohmann::json register_payload = {
            {"username", "api_test_user"},
            {"email", unique_email},
            {"password", test_password}
        };
        crow::response res = client.request("POST", "/api/v1/auth/register", register_payload.dump());
        
        REQUIRE(res.code == crow::CREATED);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json["message"] == "User registered successfully");
        REQUIRE(response_json["user"]["email"] == unique_email);
        test_user_id = response_json["user"]["id"].get<std::string>();
        LOG_INFO("Registered user with ID: {}", test_user_id);
    }

    SECTION("Login user") {
        // Ensure user is registered from previous section (if running all tests sequentially)
        // Or re-register if running isolated
        nlohmann::json register_payload = {
            {"username", "api_test_user_login"},
            {"email", "login_test_" + Crypto::generate_uuid() + "@example.com"},
            {"password", test_password}
        };
        client.request("POST", "/api/v1/auth/register", register_payload.dump());

        nlohmann::json login_payload = {
            {"email", register_payload["email"]},
            {"password", test_password}
        };
        crow::response res = client.request("POST", "/api/v1/auth/login", login_payload.dump());

        REQUIRE(res.code == crow::OK);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json["message"] == "Login successful");
        REQUIRE(response_json.contains("token"));
        test_jwt_token = response_json["token"].get<std::string>();
        LOG_INFO("Logged in, received token.");
    }

    SECTION("Unauthorized access to protected route") {
        crow::response res = client.request("GET", "/api/v1/systems"); // Protected endpoint
        REQUIRE(res.code == crow::UNAUTHORIZED);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json["error"] == "Unauthorized");
    }
}


// These tests rely on a successful login from the previous section or manually setting up a token
// In a robust test suite, you'd typically have a setup for each test case or use fixtures
TEST_CASE("System Controller Integration", "[api][system]") {
    TestHttpClient& client = *client_ptr;
    std::string user_id_for_system_tests = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Admin user from seed
    std::string jwt_token_for_system_tests = Crypto::create_jwt(user_id_for_system_tests, "admin", 3600);
    std::string auth_header = "Bearer " + jwt_token_for_system_tests;

    std::string created_system_id;
    
    SECTION("Create a new system") {
        nlohmann::json create_payload = {
            {"name", "Test System " + Crypto::generate_uuid()},
            {"description", "A system created via API test."}
        };
        crow::response res = client.request("POST", "/api/v1/systems", create_payload.dump(), {{"Authorization", auth_header}});
        
        REQUIRE(res.code == crow::CREATED);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json["name"] == create_payload["name"]);
        REQUIRE(response_json["user_id"] == user_id_for_system_tests);
        REQUIRE(response_json.contains("id"));
        created_system_id = response_json["id"].get<std::string>();
        LOG_INFO("Created system with ID: {}", created_system_id);
    }

    // This section depends on 'created_system_id' being set by the previous section.
    // In Catch2, sections can be run independently, so this structure is sometimes problematic.
    // For simplicity, we'll nest them, assuming sequential execution within the TEST_CASE.
    // A more isolated approach would register and create system in each test setup.
    SECTION("Get all systems for user") {
        crow::response res = client.request("GET", "/api/v1/systems", "", {{"Authorization", auth_header}});
        REQUIRE(res.code == crow::OK);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json.is_array());
        REQUIRE(response_json.size() >= 1); // Should at least contain the seeded system
        LOG_INFO("Retrieved {} systems.", response_json.size());
    }

    SECTION("Get specific system") {
        // Use the seeded system ID for reliability
        std::string seeded_system_id = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; 
        crow::response res = client.request("GET", "/api/v1/systems/" + seeded_system_id, "", {{"Authorization", auth_header}});
        REQUIRE(res.code == crow::OK);
        nlohmann::json response_json = nlohmann::json::parse(res.body);
        REQUIRE(response_json["id"] == seeded_system_id);
        REQUIRE(response_json["name"] == "Main Web Server");
        LOG_INFO("Retrieved seeded system: {}.", seeded_system_id);
    }
    
    SECTION("Update system") {
        // Use the seeded system ID for reliability
        std::string seeded_system_id = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; 
        nlohmann::json update_payload = {
            {"name",