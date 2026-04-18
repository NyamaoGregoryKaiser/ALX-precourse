#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/database/db_manager.h"
#include "../../src/utils/logger.h"
#include "../../src/config/config.h" // For DB config

#include <stdexcept>
#include <thread>
#include <chrono>

// Helper to load DB config
Config::DatabaseConfig loadTestDbConfig() {
    // This assumes environment variables are set for the test database
    // In CI/CD, these would be set by the workflow or docker-compose setup
    try {
        return Config::loadDatabaseConfig();
    } catch (const std::runtime_error& e) {
        Logger::error("Failed to load DB config for tests: {}", e.what());
        // Provide sane defaults for local testing if env vars aren't set
        return {
            "localhost", 5432, "project_management_db", "pma_user", "pma_password"
        };
    }
}

class DbManagerIntegrationTest : public ::testing::Test {
protected:
    static void SetUpTestSuite() {
        Logger::init("off"); // Suppress logger output for tests
        Config::DatabaseConfig db_conf = loadTestDbConfig();
        db_connection_string_ = fmt::format(
            "host={} port={} dbname={} user={} password={}",
            db_conf.db_host, db_conf.db_port, db_conf.db_name, db_conf.db_user, db_conf.db_password
        );
        
        // Ensure the database is clean before running tests.
        // This is crucial for integration tests.
        // For a more robust solution, use a separate test database or transactions for each test.
        // Here, we'll try to execute a cleanup script.
        try {
            pqxx::connection conn(db_connection_string_);
            pqxx::work txn(conn);
            // Drop and recreate tables as per migration V1 to ensure clean state
            std::string cleanup_sql = R"(
                DROP TABLE IF EXISTS user_project CASCADE;
                DROP TABLE IF EXISTS user_team CASCADE;
                DROP TABLE IF EXISTS tasks CASCADE;
                DROP TABLE IF EXISTS projects CASCADE;
                DROP TABLE IF EXISTS teams CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            )";
            std::string create_sql = R"(
                CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
                CREATE TABLE teams (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
                CREATE TABLE projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, description TEXT, start_date DATE, end_date DATE, status VARCHAR(20) NOT NULL DEFAULT 'planning', owner_id UUID NOT NULL, team_id UUID, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL);
                CREATE TABLE tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL, title VARCHAR(150) NOT NULL, description TEXT, due_date DATE, status VARCHAR(20) NOT NULL DEFAULT 'todo', assigned_to_id UUID, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL);
                CREATE TABLE user_team (user_id UUID NOT NULL, team_id UUID NOT NULL, PRIMARY KEY (user_id, team_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE);
                CREATE TABLE user_project (user_id UUID NOT NULL, project_id UUID NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'member', PRIMARY KEY (user_id, project_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE);
            )";

            // Add triggers for updated_at timestamps
            std::string trigger_sql = R"(
                CREATE OR REPLACE FUNCTION update_timestamp_column()
                RETURNS TRIGGER AS $$
                BEGIN
                   NEW.updated_at = NOW();
                   RETURN NEW;
                END;
                $$ language 'plpgsql';

                CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
                CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
                CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
                CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
            )";

            txn.exec(cleanup_sql);
            txn.exec(create_sql);
            txn.exec(trigger_sql);
            txn.commit();
            Logger::info("Database schema reset for testing.");
        } catch (const pqxx::broken_connection& e) {
            Logger::critical("FATAL: Database connection broken during setup. Is PostgreSQL running and accessible? {}", e.what());
            // Fail fast if database isn't reachable
            FAIL() << "Database connection broken during setup: " << e.what();
        } catch (const std::exception& e) {
            Logger::critical("FATAL: Error during database setup for tests: {}", e.what());
            FAIL() << "Error during database setup: " << e.what();
        }
        
        // Initialize the actual DbManager after cleanup
        db_manager_ = &DbManager::getInstance(db_connection_string_);
    }

    static void TearDownTestSuite() {
        // No explicit teardown needed for the singleton DbManager, connections close on app exit.
    }

    void SetUp() override {
        // Any per-test setup, e.g., cleaning up data from previous test if using same DB
    }

    void TearDown() override {
        // Any per-test teardown
    }

    static std::string db_connection_string_;
    static DbManager* db_manager_;
};

std::string DbManagerIntegrationTest::db_connection_string_;
DbManager* DbManagerIntegrationTest::db_manager_ = nullptr;

TEST_F(DbManagerIntegrationTest, GetConnectionReturnsValidConnection) {
    ASSERT_NE(db_manager_, nullptr);
    pqxx::connection& conn = db_manager_->getConnection();
    ASSERT_TRUE(conn.is_open());
    ASSERT_FALSE(conn.is_transacting()); // Should not be in a transaction initially
    db_manager_->releaseConnection(std::make_unique<pqxx::connection>(std::move(conn)));
}

TEST_F(DbManagerIntegrationTest, ConnectionGuardWorksCorrectly) {
    ASSERT_NE(db_manager_, nullptr);
    {
        ConnectionGuard guard(*db_manager_);
        ASSERT_TRUE(guard->is_open());
        // Perform a simple query
        pqxx::nontransaction N(*guard);
        pqxx::result r = N.exec("SELECT 1;");
        ASSERT_EQ(r[0][0].as<int>(), 1);
    } // ConnectionGuard goes out of scope and releases connection
    // Cannot assert on the specific connection object after release, as it's moved
}

TEST_F(DbManagerIntegrationTest, PoolHandlesMultipleConnections) {
    ASSERT_NE(db_manager_, nullptr);
    std::vector<std::unique_ptr<pqxx::connection>> connections;
    for (size_t i = 0; i < 5; ++i) {
        connections.push_back(std::make_unique<pqxx::connection>(db_manager_->getConnection()));
        ASSERT_TRUE(connections.back()->is_open());
    }

    // Release them
    for (auto& conn_ptr : connections) {
        if (conn_ptr->is_open()) {
            db_manager_->releaseConnection(std::move(conn_ptr));
        }
    }
    connections.clear(); // Ensure unique_ptrs are moved and go out of scope
}

TEST_F(DbManagerIntegrationTest, BasicCrudOperations) {
    ASSERT_NE(db_manager_, nullptr);
    // Use ConnectionGuard for automatic connection management
    {
        ConnectionGuard guard(*db_manager_);
        pqxx::work txn(*guard);

        // CREATE a user
        std::string user_id;
        std::string username = "integration_test_user";
        std::string email = "integration@test.com";
        std::string password_hash = "hashed_test_password";

        pqxx::result r_insert = txn.exec_params(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id;",
            username, email, password_hash
        );
        ASSERT_FALSE(r_insert.empty());
        user_id = r_insert[0]["id"].as<std::string>();
        txn.commit(); // Commit the insert
        Logger::debug("Created user with ID: {}", user_id);
    }

    {
        ConnectionGuard guard(*db_manager_);
        pqxx::nontransaction N(*guard);

        // READ the user
        pqxx::result r_select = N.exec_params(
            "SELECT username, email, password_hash FROM users WHERE id = $1;",
            user_id
        );
        ASSERT_FALSE(r_select.empty());
        ASSERT_EQ(r_select[0]["username"].as<std::string>(), "integration_test_user");
        ASSERT_EQ(r_select[0]["email"].as<std::string>(), "integration@test.com");
        ASSERT_EQ(r_select[0]["password_hash"].as<std::string>(), "hashed_test_password");
        Logger::debug("Read user with ID: {}", user_id);
    }

    {
        ConnectionGuard guard(*db_manager_);
        pqxx::work txn(*guard);

        // UPDATE the user
        std::string new_username = "updated_test_user";
        pqxx::result r_update = txn.exec_params(
            "UPDATE users SET username = $1 WHERE id = $2 RETURNING username;",
            new_username, user_id
        );
        ASSERT_FALSE(r_update.empty());
        ASSERT_EQ(r_update[0]["username"].as<std::string>(), new_username);
        txn.commit(); // Commit the update
        Logger::debug("Updated user with ID: {}", user_id);
    }

    {
        ConnectionGuard guard(*db_manager_);
        pqxx::work txn(*guard);

        // DELETE the user
        pqxx::result r_delete = txn.exec_params(
            "DELETE FROM users WHERE id = $1;",
            user_id
        );
        ASSERT_EQ(r_delete.affected_rows(), 1);
        txn.commit(); // Commit the delete
        Logger::debug("Deleted user with ID: {}", user_id);
    }

    {
        ConnectionGuard guard(*db_manager_);
        pqxx::nontransaction N(*guard);

        // VERIFY deletion
        pqxx::result r_verify = N.exec_params(
            "SELECT id FROM users WHERE id = $1;",
            user_id
        );
        ASSERT_TRUE(r_verify.empty());
        Logger::debug("Verified user deletion for ID: {}", user_id);
    }
}
```