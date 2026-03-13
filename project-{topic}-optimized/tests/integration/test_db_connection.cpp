#include <gtest/gtest.h>
#include "../../src/database/db_connection.hpp"
#include "../../src/common/config.hpp"
#include "../../src/common/logger.hpp"
#include <thread>
#include <vector>

// Define a test fixture for database connection tests
class DBConnectionTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize logger for tests
        cms::common::Logger::set_level("debug");
        LOG_INFO("Setting up DBConnectionTest...");

        // Ensure database connection parameters are set for testing
        // These can be read from environment variables or a specific test config file
        // For local testing, ensure your .env (or environment variables) are set correctly
        // to connect to the 'cms_db' from docker-compose.
        // e.g., DB_HOST=localhost, DB_PORT=5432, DB_USER=cms_user, DB_PASSWORD=cms_password, DB_NAME=cms_db
        // The AppConfig singleton handles reading these from environment.
        const auto& config = cms::common::AppConfig::get_instance();
        LOG_INFO("DB Config for tests: Host={}, Port={}, User={}, DB={}",
                 config.db_host, config.db_port, config.db_user, config.db_name);
    }

    void TearDown() override {
        LOG_INFO("Tearing down DBConnectionTest.");
    }
};

TEST_F(DBConnectionTest, CanConnectToDatabase) {
    ASSERT_NO_THROW({
        auto conn = cms::database::DBConnection::get_instance().get_connection();
        ASSERT_TRUE(conn->is_open());
        LOG_INFO("Successfully connected to database.");
        // Perform a simple query to ensure the connection is active
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec("SELECT 1");
        ASSERT_FALSE(R.empty());
        ASSERT_EQ(R[0][0].as<int>(), 1);
    }) << "Failed to connect or perform basic query.";
}

TEST_F(DBConnectionTest, ConnectionIsUniquePerCall) {
    auto conn1 = cms::database::DBConnection::get_instance().get_connection();
    auto conn2 = cms::database::DBConnection::get_instance().get_connection();

    // With `std::unique_ptr` and `get_connection()` creating a new connection each time,
    // these should be distinct connection objects.
    ASSERT_NE(conn1.get(), conn2.get());
    ASSERT_TRUE(conn1->is_open());
    ASSERT_TRUE(conn2->is_open());
}

TEST_F(DBConnectionTest, HandleConcurrentConnections) {
    int num_threads = 10;
    std::vector<std::thread> threads;
    std::vector<bool> results(num_threads);

    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back([this, i, &results]() {
            try {
                auto conn = cms::database::DBConnection::get_instance().get_connection();
                pqxx::nontransaction N(*conn);
                pqxx::result R = N.exec("SELECT pg_backend_pid()"); // Get backend PID to check distinctness
                
                // If we got here, connection was successful and query ran
                results[i] = true;
                LOG_DEBUG("Thread {}: Successfully connected with backend PID {}", i, R[0][0].as<int>());

            } catch (const std::exception& e) {
                LOG_ERROR("Thread {}: Failed to connect or query: {}", i, e.what());
                results[i] = false;
            }
        });
    }

    for (auto& t : threads) {
        t.join();
    }

    for (int i = 0; i < num_threads; ++i) {
        ASSERT_TRUE(results[i]) << "Thread " << i << " failed to connect to database.";
    }
}
```