```cpp
#include "gtest/gtest.h"
#include "../../src/server/HttpServer.h" // Include main server to run it in a thread
#include "../../src/config/Config.h"
#include "../../src/utils/Logger.h"
#include <httplib.h> // For making HTTP requests in tests
#include <thread>
#include <chrono>
#include <pqxx/pqxx> // For cleaning DB after tests

// Global variables for server control
std::unique_ptr<HttpServer> server_ptr;
std::thread server_thread;
const int TEST_SERVER_PORT = 18081; // Use a different port for testing

// --- Helper functions for tests ---
void setupDatabaseForTests() {
    // Connect to test DB and ensure it's clean for each run
    // This is a simplified approach. For complex scenarios, dedicated test DBs or transactions are better.
    try {
        std::string conn_string = "host=" + Config::getDbHost() +
                                  " port=" + std::to_string(Config::getDbPort()) +
                                  " user=" + Config::getDbUser() +
                                  " password=" + Config::getDbPassword() +
                                  " dbname=" + Config::getDbName();
        pqxx::connection C(conn_string);
        pqxx::work W(C);

        W.exec("TRUNCATE TABLE visualizations CASCADE;");
        W.exec("TRUNCATE TABLE datasets CASCADE;");
        W.exec("TRUNCATE TABLE users CASCADE;");
        W.commit();
        Logger::info("Database truncated for integration tests.");

        // Re-seed necessary data (e.g., admin user)
        pqxx::work W_seed(C);
        W_seed.exec("INSERT INTO users (email, password_hash, role) VALUES ('admin@test.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;");
        W_seed.exec("INSERT INTO users (email, password_hash, role) VALUES ('user@test.com', '96e00000a68d7162986422f254924c80330691880482069c990263309a96e000', 'user') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;");
        W_seed.commit();
        Logger::info("Test users seeded.");

    } catch (const std::exception &e) {
        Logger::critical("Failed to setup database for tests: {}", e.what());
        FAIL() << "Database setup failed: " << e.what();
    }
}

// --- Global Test Environment ---
class ApiTestEnvironment : public ::testing::Environment {
public:
    void SetUp() override {
        // Load configuration before starting the server
        Config::loadFromEnv();
        // Override the app port for testing
        // This is a bit hacky for a static Config, better to pass a Config object.
        // For now, rely on `DATA_VIZ_APP_PORT` env var if set, otherwise test port.
        // If Config allows dynamic override, use: Config::setAppPort(TEST_SERVER_PORT);
        // For simplicity, we'll assume the environment variable `DATA_VIZ_APP_PORT`
        // is set to TEST_SERVER_PORT (or it defaults to 18080 and we test against that).
        // For isolated test, ensure Crow app is configured with specific port.
        // In this setup, we'll rely on the global Config.
        setenv("DATA_VIZ_APP_PORT", std::to_string(TEST_SERVER_PORT).c_str(), 1);
        setenv("DATA_VIZ_JWT_SECRET", "test_super_secret_key_1234567890", 1);
        Logger::init("debug");
        Logger::info("Setting up API Test Environment.");

        // Setup a clean database state
        setupDatabaseForTests();

        // Start the server in a separate thread
        server_ptr = std::make_unique<HttpServer>();
        server_thread = std::thread([]() {
            try {
                server_ptr->run();
            } catch (const std::exception& e) {
                Logger::error("Server thread exception: {}", e.what());
            }
        });

        // Give the server a moment to start up
        std::this_thread::sleep_for(std::chrono::seconds(2));
        Logger::info("Server started on port {}.", Config::getAppPort());
    }

    void TearDown() override {
        Logger::info("Tearing down API Test Environment.");
        // Stop the server (Crow provides app.stop() but it might not be exposed easily for external thread shutdown)
        // For this simple example, we might rely on the main function of Crow finishing
        // or let the test framework end (not ideal for robust shutdown).
        // A proper Crow app would have an `app.stop()` method.
        // For Crow, `app.stop()` can be called. But the `HttpServer` class above does not expose it.
        // We'll have to terminate the thread, which is generally unsafe.
        // For a real app, the `HttpServer` should expose a `stop()` method that calls `app.stop()`.
        
        // For now, let's just detach and trust the process cleanup or assume short-lived app.
        // If `server_thread.join()` hangs, need to implement a clean shutdown mechanism for Crow.
        // server_thread.join(); // This would block if app.run() doesn't terminate.
        // As a workaround for testing, we can kill the thread if a proper shutdown isn't available.
        // This is not good practice for production code.
        // If app.run() is blocking, the thread will continue running until process exit.
        if (server_thread.joinable()) {
            // Crow doesn't directly expose `stop` through the `app` instance in the same way some other frameworks do,
            // or rather, the `run()` method blocks. For a graceful shutdown, a signal handler or a way to break
            // the `app.run()` loop is needed. For testing, we might just detach and let the test runner handle cleanup.
            server_thread.detach(); // Detach the thread. It will terminate when the process exits.
        }
        
        Logger::info("API Test Environment torn down.");
        unsetenv("DATA_VIZ_APP_PORT"); // Clean up env var
        unsetenv("DATA_VIZ_JWT_SECRET");
    }
};

// Add our global test environment
[[maybe_unused]] testing::Environment* const env =
    testing::AddGlobalTestEnvironment(new ApiTestEnvironment);


// --- Integration Tests ---

class ApiIntegrationTest : public ::testing::Test {
protected:
    httplib::Client client;
    std::string user_token; // Store token for authenticated requests
    std::string admin_token;

    ApiIntegrationTest() : client("localhost", TEST_SERVER_PORT) {
        // Nothing to do in constructor, setup is done in SetUp
    }

    void SetUp() override {
        // Login admin user
        json admin_login_payload = {{"email", "admin@test.com"}, {"password", "adminpass"}};
        auto admin_res = client.Post("/api/auth/login", admin_login_payload.dump(), "application/json");
        ASSERT_TRUE(admin_res);
        ASSERT_EQ(admin_res->status, 200);
        admin_token = json::parse(admin_res->body)["data"]["token"].get<std::string>();

        // Login regular user
        json user_login_payload = {{"email", "user@test.com"}, {"password", "userpass"}};
        auto user_res = client.Post("/api/auth/login", user_login_payload.dump(), "application/json");
        ASSERT_TRUE(user_res);
        ASSERT_EQ(user_res->status, 200);
        user_token = json::parse(user_res->body)["data"]["token"].get<std::string>();
    }

    // Helper to make authenticated requests
    httplib::Result Get(const std::string& path, const std::string& token) {
        httplib::Headers headers = {{"Authorization", "Bearer " + token}};
        return client.Get(path, headers);
    }

    httplib::Result Post(const std::string& path, const std::string& body, const std::string& token) {
        httplib::Headers headers = {{"Authorization", "Bearer " + token}};
        return client.Post(path, headers, body, "application/json");
    }

    httplib::Result Put(const std::string& path, const std::string& body, const std::string& token) {
        httplib::Headers headers = {{"Authorization", "Bearer " + token}};
        return client.Put(path, headers, body, "application/json");
    }

    httplib::Result Delete(const std::string& path, const std::string& token) {
        httplib::Headers headers = {{"Authorization", "Bearer " + token}};
        return client.Delete(path, headers);
    }
};

TEST_F(ApiIntegrationTest, HealthCheckReturnsOk) {
    auto res = client.Get("/health");
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 200);
    json response_body = json::parse(res->body);
    ASSERT_EQ(response_body["status"], "success");
}

TEST_F(ApiIntegrationTest, UserRegistrationAndLogin) {
    json register_payload = {{"email", "newuser@test.com"}, {"password", "newpass123"}};
    auto res = client.Post("/api/auth/register", register_payload.dump(), "application/json");
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 201); // Created

    json login_payload = {{"email", "newuser@test.com"}, {"password", "newpass123"}};
    res = client.Post("/api/auth/login", login_payload.dump(), "application/json");
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 200);
    json response_body = json::parse(res->body);
    ASSERT_EQ(response_body["status"], "success");
    ASSERT_TRUE(response_body["data"].contains("token"));
    ASSERT_TRUE(response_body["data"]["user"]["email"] == "newuser@test.com");
}

TEST_F(ApiIntegrationTest, LoginWithInvalidCredentialsFails) {
    json login_payload = {{"email", "user@test.com"}, {"password", "wrongpassword"}};
    auto res = client.Post("/api/auth/login", login_payload.dump(), "application/json");
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 401); // Unauthorized
}

TEST_F(ApiIntegrationTest, CreateAndGetDataset) {
    json create_payload = {
        {"name", "Test Dataset"},
        {"description", "A dataset for testing"},
        {"fileName", "test_data.csv"},
        {"fileType", "csv"},
        {"fileContent", "col1,col2\nval1,100\nval2,200"}
    };
    auto res = Post("/api/datasets", create_payload.dump(), user_token);
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 201);
    json response_body = json::parse(res->body);
    ASSERT_EQ(response_body["status"], "success");
    int dataset_id = response_body["data"]["id"].get<int>();
    
    // Retrieve the created dataset
    res = Get("/api/datasets/" + std::to_string(dataset_id), user_token);
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 200);
    response_body = json::parse(res->body);
    ASSERT_EQ(response_body["data"]["name"], "Test Dataset");
    ASSERT_EQ(response_body["data"]["columns"][0]["name"], "col1");
    ASSERT_EQ(response_body["data"]["columns"][0]["type"], "string");
    ASSERT_EQ(response_body["data"]["columns"][1]["name"], "col2");
    ASSERT_EQ(response_body["data"]["columns"][1]["type"], "number");
}

TEST_F(ApiIntegrationTest, UnauthorizedAccessToDatasetFails) {
    // Attempt to access without token
    auto res = client.Get("/api/datasets/1");
    ASSERT_TRUE(res);
    ASSERT_EQ(res->status, 401);

    // Create a dataset with User A
    json create_payload = {
        {"name", "UserA Dataset"},
        {"fileName", "user_a.csv"},
        {"fileType", "csv"},
        {"fileContent", "a,b\n1,2"}
    };
    auto res_a = Post("/api/datasets", create_payload.dump(), user_token);
    ASSERT_EQ(res_a->status, 201);
    int dataset_a_id = json::parse(res_a->body)["data"]["id"].get<int>();

    // Login another user, not owner of dataset_a_id
    json other_user_register = {{"email", "other@test.com"}, {"password", "otherpass"}};
    client.Post("/api/auth/register", other_user_register.dump(), "application/json");
    json other_user_login = {{"email", "other@test.com"}, {"password", "otherpass"}};
    auto other_login_res = client.Post("/api/auth/login", other_user_login.dump(), "application/json");
    std::string other_user_token = json::parse(other_login_res->body)["data"]["token"].get<std::string>();

    // User B tries to access User A's dataset
    auto res_b = Get("/api/datasets/" + std::to_string(dataset_a_id), other_user_token);
    ASSERT_TRUE(res_b);
    ASSERT_EQ(res_b->status, 403); // Forbidden
}

TEST_F(ApiIntegrationTest, ProcessDatasetData) {
    // Create a dataset
    json create_payload = {
        {"name", "Sales Data for Processing"},
        {"description", "Sales figures"},
        {"fileName", "sales.csv"},
        {"fileType", "csv"},
        {"fileContent", "Region,Product,Sales,Units\nEast,A,100,10\nWest,B,150,15\nEast,A,200,20\nWest,C,50,5"}
    };
    auto res_create = Post("/api/datasets", create_payload.dump(), user_token);
    ASSERT_EQ(res_create->status, 201);
    int dataset_id = json::parse(res_create->body)["data"]["id"].get<int>();

    // Request processed data: Group by Region, sum Sales and Units
    json data_request_payload = {
        {"groupBy", {
            {{"column", "Region"}, {"alias", "SalesRegion"}}
        }},
        {"aggregations", {
            {{"column", "Sales"}, {"function", "sum"}, {"alias", "TotalSales"}},
            {{"column", "Units"}, {"function", "sum"}, {"alias", "TotalUnits"}}
        }},
        {"sortBy", {
            {{"column", "SalesRegion"}, {"direction", "asc"}}
        }}
    };

    auto res_process = Post("/api/datasets/" + std::to_string(dataset_id) + "/data", data_request_payload.dump(), user_token);
    ASSERT_TRUE(res_process);
    ASSERT_EQ(res_process->status, 200);
    json response_body = json::parse(res_process->body);
    ASSERT_EQ(response_body["status"], "success");
    ASSERT_TRUE(response_body["data"].contains("rows"));
    ASSERT_TRUE(response_body["data"].contains("columns"));

    json rows = response_body["data"]["rows"];
    ASSERT_EQ(rows.size(), 2);
    ASSERT_EQ(rows[0]["SalesRegion"], "East");
    ASSERT_EQ(rows[0]["TotalSales"], 300.0); // 100 + 200
    ASSERT_EQ(rows[0]["TotalUnits"], 30.0);  // 10 + 20

    ASSERT_EQ(rows[1]["SalesRegion"], "West");
    ASSERT_EQ(rows[1]["TotalSales"], 200.0); // 150 + 50
    ASSERT_EQ(rows[1]["TotalUnits"], 20.0);  // 15 + 5
}

TEST_F(ApiIntegrationTest, CreateUpdateDeleteVisualization) {
    // First, create a dataset
    json create_ds_payload = {
        {"name", "Viz Test Data"},
        {"fileName", "viz_data.csv"},
        {"fileType", "csv"},
        {"fileContent", "item,count\nA,10\nB,20"}
    };
    auto res_ds = Post("/api/datasets", create_ds_payload.dump(), user_token);
    ASSERT_EQ(res_ds->status, 201);
    int dataset_id = json::parse(res_ds->body)["data"]["id"].get<int>();

    // 1. Create a visualization
    json create_viz_payload = {
        {"datasetId", dataset_id},
        {"name", "Initial Bar Chart"},
        {"description", "A simple bar chart"},
        {"chartType", "bar"},
        {"config", {{"xAxis", "item"}, {"yAxis", "count"}}}
    };
    auto res_create_viz = Post("/api/visualizations", create_viz_payload.dump(), user_token);
    ASSERT_TRUE(res_create_viz);
    ASSERT_EQ(res_create_viz->status, 201);
    json response_body = json::parse(res_create_viz->body);
    ASSERT_EQ(response_body["status"], "success");
    int viz_id = response_body["data"]["id"].get<int>();
    ASSERT_EQ(response_body["data"]["name"], "Initial Bar Chart");

    // 2. Get the visualization
    auto res_get_viz = Get("/api/visualizations/" + std::to_string(viz_id), user_token);
    ASSERT_TRUE(res_get_viz);
    ASSERT_EQ(res_get_viz->status, 200);
    response_body = json::parse(res_get_viz->body);
    ASSERT_EQ(response_body["data"]["name"], "Initial Bar Chart");

    // 3. Update the visualization
    json update_viz_payload = {
        {"name", "Updated Line Chart"},
        {"chartType", "line"},
        {"config", {{"xAxis", "item"}, {"yAxis", "count"}, {"color", "blue"}}}
    };
    auto res_update_viz = Put("/api/visualizations/" + std::to_string(viz_id), update_viz_payload.dump(), user_token);
    ASSERT_TRUE(res_update_viz);
    ASSERT_EQ(res_update_viz->status, 200);
    response_body = json::parse(res_update_viz->body);
    ASSERT_EQ(response_body["data"]["name"], "Updated Line Chart");
    ASSERT_EQ(response_body["data"]["chartType"], "line");
    ASSERT_EQ(response_body["data"]["config"]["color"], "blue");

    // 4. Delete the visualization
    auto res_delete_viz = Delete("/api/visualizations/" + std::to_string(viz_id), user_token);
    ASSERT_TRUE(res_delete_viz);
    ASSERT_EQ(res_delete_viz->status, 200);
    response_body = json::parse(res_delete_viz->body);
    ASSERT_EQ(response_body["status"], "success");

    // Verify it's deleted
    res_get_viz = Get("/api/visualizations/" + std::to_string(viz_id), user_token);
    ASSERT_TRUE(res_get_viz);
    ASSERT_EQ(res_get_viz->status, 404); // Not Found
}
```