```cpp
#include "gtest/gtest.h"
#include "data/db/Database.h"
#include "data/db/repositories/UserRepository.h"
#include "data/db/repositories/DashboardRepository.h"
#include "data/db/migrations/MigrationManager.h"
#include "core/config/ConfigManager.h"
#include "util/Logger.h"
#include "core/common/Utils.h" // For SHA256 mock

#include <pqxx/pqxx>
#include <thread>
#include <chrono>

// Initialize logger and config for tests
void init_integration_logger_and_config() {
    static bool initialized = false;
    if (!initialized) {
        VisuFlow::Util::Logger::init("debug", "test_integration.log");
        // Load config specific for integration tests
        VisuFlow::Core::Config::ConfigManager::loadConfig("config.json");
        initialized = true;
    }
}

// Fixture for database tests to ensure a clean state
class DatabaseIntegrationTest : public ::testing::Test {
protected:
    static std::string db_name_prefix;
    static std::atomic_int test_db_counter;
    std::string test_db_name;
    VisuFlow::Data::DB::UserRepository userRepository;
    VisuFlow::Data::DB::DashboardRepository dashboardRepository;

    void SetUp() override {
        init_integration_logger_and_config();
        auto& config = VisuFlow::Core::Config::ConfigManager::getInstance();

        // Create a unique database for each test fixture instance
        test_db_name = db_name_prefix + std::to_string(test_db_counter++);
        VisuFlow::Util::Logger::log(spdlog::level::info, "Setting up test database: {}", test_db_name);

        // Connect to default postgres DB to create new test DB
        try {
            pqxx::connection root_conn(
                "host=" + config.getString("db_host", "localhost") +
                " port=" + config.getString("db_port", "5432") +
                " dbname=postgres" +
                " user=" + config.getString("db_user", "visuflow_user") +
                " password=" + config.getString("db_password", "password")
            );
            pqxx::work txn(root_conn);
            txn.exec("CREATE DATABASE " + txn.quote_name(test_db_name));
            txn.commit();
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Created temporary database: {}", test_db_name);
        } catch (const pqxx::unique_violation& e) {
             VisuFlow::Util::Logger::log(spdlog::level::warn, "Database {} already exists, skipping creation.", test_db_name);
        }
        catch (const std::exception& e) {
            VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to create temporary database: {}", e.what());
            FAIL() << "Failed to create temporary database: " << e.what();
        }

        // Initialize Database singleton with test database
        VisuFlow::Data::DB::Database::init(
            config.getString("db_host", "localhost"),
            config.getString("db_port", "5432"),
            test_db_name,
            config.getString("db_user", "visuflow_user"),
            config.getString("db_password", "password")
        );

        // Run migrations on the test database
        VisuFlow::Data::DB::MigrationManager migrator("scripts/db/migrations");
        migrator.runMigrations();

        // Seed some basic test data
        pqxx::connection conn_test(*VisuFlow::Data::DB::Database::getInstance().getConnection());
        pqxx::work txn_test(conn_test);
        std::string hashed_pass = VisuFlow::Core::Common::Utils::sha256("password");
        txn_test.exec_params("INSERT INTO users (username, hashed_password, email, role) VALUES ('testuser', $1, 'test@example.com', 'editor')", hashed_pass);
        txn_test.exec_params("INSERT INTO users (username, hashed_password, email, role) VALUES ('adminuser', $1, 'admin@example.com', 'admin')", hashed_pass);
        txn_test.commit();

        userRepository = VisuFlow::Data::DB::UserRepository();
        dashboardRepository = VisuFlow::Data::DB::DashboardRepository();
    }

    void TearDown() override {
        auto& config = VisuFlow::Core::Config::ConfigManager::getInstance();
        VisuFlow::Util::Logger::log(spdlog::level::info, "Tearing down test database: {}", test_db_name);

        // Disconnect all connections from the test DB and then drop it
        try {
            pqxx::connection root_conn(
                "host=" + config.getString("db_host", "localhost") +
                " port=" + config.getString("db_port", "5432") +
                " dbname=postgres" +
                " user=" + config.getString("db_user", "visuflow_user") +
                " password=" + config.getString("db_password", "password")
            );
            pqxx::work txn(root_conn);
            txn.exec("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = " + txn.quote(test_db_name) + ";");
            txn.exec("DROP DATABASE " + txn.quote_name(test_db_name));
            txn.commit();
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Dropped temporary database: {}", test_db_name);
        } catch (const std::exception& e) {
            VisuFlow::Util::Logger::log(spdlog::level::error, "Failed to drop temporary database: {}", e.what());
            // Don't fail the test, but log severe error
        }
    }
};

std::string DatabaseIntegrationTest::db_name_prefix = "visuflow_test_db_";
std::atomic_int DatabaseIntegrationTest::test_db_counter = 0;


TEST_F(DatabaseIntegrationTest, UserCreationAndRetrieval) {
    VisuFlow::Data::Model::User newUser = userRepository.create("newuser", "hashedpass", "new@example.com", "viewer");
    ASSERT_NE(newUser.id, 0);
    ASSERT_EQ(newUser.username, "newuser");

    VisuFlow::Data::Model::User foundUser = userRepository.findById(newUser.id);
    ASSERT_EQ(foundUser.username, "newuser");
    ASSERT_EQ(foundUser.email, "new@example.com");

    VisuFlow::Data::Model::User foundUserByUsername = userRepository.findByUsername("newuser");
    ASSERT_EQ(foundUserByUsername.id, newUser.id);
}

TEST_F(DatabaseIntegrationTest, DashboardCreationAndRetrieval) {
    // Get an existing user to associate the dashboard with
    VisuFlow::Data::Model::User existingUser = userRepository.findByUsername("testuser");
    ASSERT_NE(existingUser.id, 0);

    std::string layout = "{\"widgets\":[{\"type\":\"chart\",\"data\":\"some_data\"}]}";
    VisuFlow::Data::Model::Dashboard newDashboard = dashboardRepository.create("My Test Dashboard", "A dashboard for testing", layout, existingUser.id);

    ASSERT_NE(newDashboard.id, 0);
    ASSERT_EQ(newDashboard.name, "My Test Dashboard");
    ASSERT_EQ(newDashboard.userId, existingUser.id);
    ASSERT_EQ(newDashboard.layoutJson, layout);

    VisuFlow::Data::Model::Dashboard foundDashboard = dashboardRepository.findById(newDashboard.id);
    ASSERT_EQ(foundDashboard.name, "My Test Dashboard");

    std::vector<VisuFlow::Data::Model::Dashboard> userDashboards = dashboardRepository.findByUserId(existingUser.id);
    ASSERT_FALSE(userDashboards.empty());
    ASSERT_EQ(userDashboards[0].id, newDashboard.id);
}

TEST_F(DatabaseIntegrationTest, UserUpdate) {
    VisuFlow::Data::Model::User userToUpdate = userRepository.findByUsername("testuser");
    ASSERT_NE(userToUpdate.id, 0);

    userToUpdate.email = "updated@example.com";
    userToUpdate.role = "admin";
    userToUpdate.hashedPassword = VisuFlow::Core::Common::Utils::sha256("newpassword");

    VisuFlow::Data::Model::User updatedUser = userRepository.update(userToUpdate);
    ASSERT_EQ(updatedUser.email, "updated@example.com");
    ASSERT_EQ(updatedUser.role, "admin");

    VisuFlow::Data::Model::User foundUpdatedUser = userRepository.findById(userToUpdate.id);
    ASSERT_EQ(foundUpdatedUser.email, "updated@example.com");
    ASSERT_EQ(foundUpdatedUser.role, "admin");
}

TEST_F(DatabaseIntegrationTest, DashboardUpdate) {
    VisuFlow::Data::Model::User existingUser = userRepository.findByUsername("testuser");
    VisuFlow::Data::Model::Dashboard initialDashboard = dashboardRepository.create("Old Name", "Old Desc", "{}", existingUser.id);

    std::string newLayout = "{\"widgets\":[{\"type\":\"line\",\"data\":\"new_data\"}]}";
    VisuFlow::Data::Model::Dashboard updatedDashboard = dashboardRepository.update(
        initialDashboard.id, "New Name", "New Description", newLayout, existingUser.id
    );

    ASSERT_EQ(updatedDashboard.id, initialDashboard.id);
    ASSERT_EQ(updatedDashboard.name, "New Name");
    ASSERT_EQ(updatedDashboard.description, "New Description");
    ASSERT_EQ(updatedDashboard.layoutJson, newLayout);
}

TEST_F(DatabaseIntegrationTest, UserDeletion) {
    VisuFlow::Data::Model::User userToDelete = userRepository.create("todelete", "hashed", "todelete@example.com", "viewer");
    ASSERT_NE(userToDelete.id, 0);

    userRepository.remove(userToDelete.id);
    VisuFlow::Data::Model::User foundUser = userRepository.findById(userToDelete.id);
    ASSERT_EQ(foundUser.id, 0); // Should not be found after deletion
}

TEST_F(DatabaseIntegrationTest, DashboardDeletion) {
    VisuFlow::Data::Model::User existingUser = userRepository.findByUsername("testuser");
    VisuFlow::Data::Model::Dashboard dashboardToDelete = dashboardRepository.create("Temp Dashboard", "", "{}", existingUser.id);

    dashboardRepository.remove(dashboardToDelete.id);
    VisuFlow::Data::Model::Dashboard foundDashboard = dashboardRepository.findById(dashboardToDelete.id);
    ASSERT_EQ(foundDashboard.id, 0);
}

TEST_F(DatabaseIntegrationTest, UserDashboardCascadeDelete) {
    VisuFlow::Data::Model::User userToDelete = userRepository.create("cascadeuser", "hashed", "cascade@example.com", "viewer");
    VisuFlow::Data::Model::Dashboard db1 = dashboardRepository.create("DB1", "", "{}", userToDelete.id);
    VisuFlow::Data::Model::Dashboard db2 = dashboardRepository.create("DB2", "", "{}", userToDelete.id);

    ASSERT_NE(userToDelete.id, 0);
    ASSERT_NE(db1.id, 0);
    ASSERT_NE(db2.id, 0);

    userRepository.remove(userToDelete.id);

    // Check if user is gone
    VisuFlow::Data::Model::User foundUser = userRepository.findById(userToDelete.id);
    ASSERT_EQ(foundUser.id, 0);

    // Check if dashboards are also gone
    VisuFlow::Data::Model::Dashboard foundDb1 = dashboardRepository.findById(db1.id);
    ASSERT_EQ(foundDb1.id, 0);
    VisuFlow::Data::Model::Dashboard foundDb2 = dashboardRepository.findById(db2.id);
    ASSERT_EQ(foundDb2.id, 0);
}
```