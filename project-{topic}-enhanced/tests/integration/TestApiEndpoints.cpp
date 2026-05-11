#include "gtest/gtest.h"
#include "../../src/server/HttpServer.h"
#include "../../src/server/RequestHandler.h"
#include "../../src/services/AuthService.h"
#include "../../src/utils/Config.h"
#include "../../src/utils/Logger.h"
#include "../../src/db/DbConnection.h"
#include "../../src/db/migrations/MigrationManager.h"

#include <boost/asio.hpp>
#include <boost/asio/spawn.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <boost/beast/ssl.hpp>
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>

namespace net = boost::asio;
namespace http = boost::beast::http;
namespace ssl = boost::asio::ssl;
using tcp = net::ip::tcp;
using json = nlohmann::json;

// Global server instance and ioc to manage its lifecycle
std::unique_ptr<HttpServer> server_ptr;
net::io_context ioc_global;
std::unique_ptr<std::thread> server_thread_ptr;
std::unique_ptr<RequestHandler> request_handler_ptr;
std::unique_ptr<AuthService> auth_service_ptr;

// Test fixture for API Integration Tests
class ApiIntegrationTest : public ::testing::Test {
protected:
    static void SetUpTestSuite() {
        Logger::init();
        LOG_INFO("Setting up Integration Test Suite...");

        // Use a test-specific environment
        Config::set("SERVER_PORT", "8888"); // Use a different port for tests
        Config::set("DB_HOST", "localhost"); // Assuming Docker Compose maps to localhost for tests
        Config::set("DB_PORT", "5432");
        Config::set("DB_USER", "ci_user"); // Use CI-specific user/db
        Config::set("DB_PASSWORD", "ci_password");
        Config::set("DB_NAME", "ci_db");
        Config::set("DB_CONNECTION_STRING", "postgresql://ci_user:ci_password@localhost:5432/ci_db");
        Config::set("JWT_SECRET", "ci_secret_for_tests_at_least_32_characters_long_abcdefghijk");
        Config::set("STATIC_FILES_PATH", "./web"); // Ensure correct path for tests

        // Initialize DB pool
        DbConnection::init(Config::get("DB_CONNECTION_STRING"));
        LOG_INFO("Test DB connection pool initialized.");

        // Run migrations for the test database
        try {
            MigrationManager migration_manager("./database/migrations");
            migration_manager.runMigrations();
            LOG_INFO("Test DB migrations completed.");
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to run test DB migrations: {}", e.what());
            // This is critical, tests cannot proceed without a proper schema
            FAIL() << "Failed to run test DB migrations: " << e.what();
        }

        // Seed data for tests
        try {
            auto conn_wrapper = DbConnection::getPool().getConnection();
            pqxx::work txn(conn_wrapper->get());
            std::ifstream seed_file("./database/seed/seed_data.sql");
            std::string seed_sql((std::istreambuf_iterator<char>(seed_file)), std::istreambuf_iterator<char>());
            txn.exec(seed_sql);
            txn.commit();
            LOG_INFO("Test DB seeded with data.");
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to seed test DB: {}", e.what());
            FAIL() << "Failed to seed test DB: " << e.what();
        }

        // Start the server in a separate thread
        auth_service_ptr = std::make_unique<AuthService>(Config::get("JWT_SECRET"));
        request_handler_ptr = std::make_unique<RequestHandler>(*auth_service_ptr);
        request_handler_ptr->setupRoutes(); // Setup routes now that services are initialized

        tcp::endpoint endpoint{net::ip::make_address(Config::get("SERVER_HOST")), static_cast<unsigned short>(std::stoi(Config::get("SERVER_PORT")))};
        server_ptr = std::make_unique<HttpServer>(ioc_global, endpoint, *request_handler_ptr);

        server_thread_ptr = std::make_unique<std::thread>([]() {
            server_ptr->run(); // This will call do_accept and block until ioc_global.stop()
            ioc_global.run(); // Run io_context for this thread
        });

        // Give the server a moment to start up
        std::this_thread::sleep_for(std::chrono::seconds(2));
        LOG_INFO("HTTP Test Server started on port 8888.");
    }

    static void TearDownTestSuite() {
        LOG_INFO("Tearing down Integration Test Suite...");
        if (server_ptr) {
            server_ptr->stop(); // Signal server to stop accepting new connections
        }
        ioc_global.stop(); // Stop the io_context

        if (server_thread_ptr && server_thread_ptr->joinable()) {
            server_thread_ptr->join(); // Wait for the server thread to finish
        }

        // Clean up test database (optional, but good practice)
        try {
            auto conn_wrapper = DbConnection::getPool().getConnection();
            pqxx::work txn(conn_wrapper->get());
            txn.exec("DROP TABLE IF EXISTS db_migrations, users, query_logs, index_recommendations, schema_issues CASCADE;");
            txn.commit();
            LOG_INFO("Test database tables dropped.");
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to drop test database tables: {}", e.what());
        }

        LOG_INFO("Integration Test Suite torn down.");
    }

    // Helper to send HTTP requests
    http::response<http::string_body> sendRequest(
        http::verb method, const std::string& target,
        const std::string& body = "",
        const std::map<std::string, std::string>& headers = {}
    ) {
        net::io_context ioc;
        tcp::resolver resolver(ioc);
        boost::beast::tcp_stream stream(ioc);

        auto const results = resolver.resolve("localhost", Config::get("SERVER_PORT"));
        stream.connect(results);

        http::request<http::string_body> req{method, target, 11 /* HTTP/1.1 */};
        req.set(http::field::host, "localhost");
        req.set(http::field::user_agent, BOOST_BEAST_VERSION_STRING);
        if (!body.empty()) {
            req.set(http::field::content_type, "application/json");
            req.body() = body;
            req.prepare_payload();
        }
        for (const auto& header : headers) {
            req.set(header.first, header.second);
        }

        http::write(stream, req);

        boost::beast::flat_buffer buffer;
        http::response<http::string_body> res;
        http::read(stream, buffer, res);

        boost::system::error_code ec;
        stream.socket().shutdown(tcp::socket::shutdown_both, ec);
        if (ec && ec != boost::system::errc::not_connected) {
            throw boost::system::system_error(ec);
        }

        return res;
    }
};

TEST_F(ApiIntegrationTest, RootEndpointReturnsHtml) {
    http::response<http::string_body> res = sendRequest(http::verb::get, "/");
    ASSERT_EQ(res.result(), http::status::ok);
    ASSERT_EQ(res[http::field::content_type], "text/html");
    ASSERT_TRUE(res.body().find("Database Optimizer") != std::string::npos);
}

TEST_F(ApiIntegrationTest, LoginEndpointSucceedsWithCorrectCredentials) {
    json login_payload;
    login_payload["username"] = "admin";
    login_payload["password"] = "admin_password_secure";

    http::response<http::string_body> res = sendRequest(http::verb::post, "/api/v1/auth/login", login_payload.dump());
    ASSERT_EQ(res.result(), http::status::ok);
    ASSERT_EQ(res[http::field::content_type], "application/json");

    json response_body = json::parse(res.body());
    ASSERT_TRUE(response_body.count("token"));
    ASSERT_FALSE(response_body["token"].get<std::string>().empty());
}

TEST_F(ApiIntegrationTest, LoginEndpointFailsWithIncorrectCredentials) {
    json login_payload;
    login_payload["username"] = "admin";
    login_payload["password"] = "wrongpassword";

    http::response<http::string_body> res = sendRequest(http::verb::post, "/api/v1/auth/login", login_payload.dump());
    ASSERT_EQ(res.result(), http::status::unauthorized);

    json response_body = json::parse(res.body());
    ASSERT_EQ(response_body["message"], "Invalid credentials");
}

TEST_F(ApiIntegrationTest, ProtectedEndpointRequiresAuthentication) {
    http::response<http::string_body> res = sendRequest(http::verb::get, "/api/v1/recommendations");
    ASSERT_EQ(res.result(), http::status::unauthorized);

    json response_body = json::parse(res.body());
    ASSERT_TRUE(response_body["message"].get<std::string>().find("missing") != std::string::npos);
}

TEST_F(ApiIntegrationTest, ProtectedEndpointAllowsAuthenticatedAccess) {
    // First, login to get a token
    json login_payload;
    login_payload["username"] = "admin";
    login_payload["password"] = "admin_password_secure";
    http::response<http::string_body> login_res = sendRequest(http::verb::post, "/api/v1/auth/login", login_payload.dump());
    json login_body = json::parse(login_res.body());
    std::string token = login_body["token"];

    // Now access the protected endpoint
    std::map<std::string, std::string> headers = {{"Authorization", "Bearer " + token}};
    http::response<http::string_body> rec_res = sendRequest(http::verb::get, "/api/v1/recommendations", "", headers);
    ASSERT_EQ(rec_res.result(), http::status::ok);
    ASSERT_EQ(rec_res[http::field::content_type], "application/json");

    json recommendations = json::parse(rec_res.body());
    ASSERT_TRUE(recommendations.is_array());
    ASSERT_FALSE(recommendations.empty());
    // Assuming seed data has at least one recommendation
    ASSERT_TRUE(recommendations[0].count("table_name"));
}

TEST_F(ApiIntegrationTest, GetUserByIdRequiresAdminRole) {
    // Login as a regular user first (if registered, or register one)
    json register_payload;
    register_payload["username"] = "testuser";
    register_payload["password_hash"] = "testpass"; // Will be hashed by handler
    register_payload["email"] = "testuser@example.com";
    sendRequest(http::verb::post, "/api/v1/auth/register", register_payload.dump());

    json login_payload;
    login_payload["username"] = "testuser";
    login_payload["password"] = "testpass";
    http::response<http::string_body> login_res = sendRequest(http::verb::post, "/api/v1/auth/login", login_payload.dump());
    json login_body = json::parse(login_res.body());
    std::string user_token = login_body["token"];

    // Attempt to get user list with non-admin token
    std::map<std::string, std::string> headers = {{"Authorization", "Bearer " + user_token}};
    http::response<http::string_body> users_res = sendRequest(http::verb::get, "/api/v1/users", "", headers);
    ASSERT_EQ(users_res.result(), http::status::forbidden);

    // Login as admin
    login_payload["username"] = "admin";
    login_payload["password"] = "admin_password_secure";
    login_res = sendRequest(http::verb::post, "/api/v1/auth/login", login_payload.dump());
    login_body = json::parse(login_res.body());
    std::string admin_token = login_body["token"];

    // Now get user list with admin token
    headers["Authorization"] = "Bearer " + admin_token;
    users_res = sendRequest(http::verb::get, "/api/v1/users", "", headers);
    ASSERT_EQ(users_res.result(), http::status::ok);
    json users_list = json::parse(users_res.body());
    ASSERT_TRUE(users_list.is_array());
    ASSERT_GE(users_list.size(), 2); // At least admin and testuser
}
```