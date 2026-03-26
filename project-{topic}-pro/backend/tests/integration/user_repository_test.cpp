#include "gtest/gtest.h"
#include "../../src/repositories/user_repository.h"
#include "../../src/config/config.h"
#include <pqxx/pqxx>
#include <thread>
#include <chrono>

// Fixture for integration tests with a test database
class UserRepositoryIntegrationTest : public Test {
protected:
    std::string test_db_conn_str;
    UserRepository* user_repo;

    void SetUp() override {
        // Load config for DB connection
        Config::load_env("../.env.example"); // Load from base dir of backend
        test_db_conn_str = Config::get_string("DATABASE_URL", "postgresql://user:password@localhost:5432/cms_test_db");

        // IMPORTANT: Ensure a separate test database or schema is used for integration tests
        // so tests don't interfere with development data.
        // For simplicity, we use the same user/password, but database name is different.

        // Ensure test database exists and is clean before each run or test suite
        // This is crucial for isolated integration tests.
        // A robust setup would involve:
        // 1. Connect to default postgres DB
        // 2. DROP DATABASE IF EXISTS cms_test_db;
        // 3. CREATE DATABASE cms_test_db;
        // 4. Apply schema migrations to cms_test_db
        // 5. Seed test data
        try {
            pqxx::connection C_admin("postgresql://user:password@localhost:5432/postgres");
            pqxx::work W_admin(C_admin);
            W_admin.exec("DROP DATABASE IF EXISTS cms_test_db WITH (FORCE);");
            W_admin.exec("CREATE DATABASE cms_test_db;");
            W_admin.commit();
            spdlog::info("Test database 'cms_test_db' created.");

            // Apply schema to the new test database
            pqxx::connection C_test(test_db_conn_str);
            pqxx::work W_test(C_test);
            std::ifstream schema_file("../database/schema/001_initial_schema.sql");
            std::stringstream buffer;
            buffer << schema_file.rdbuf();
            W_test.exec(buffer.str());
            W_test.commit();
            spdlog::info("Schema applied to 'cms_test_db'.");

        } catch (const pqxx::sql_error& e) {
            spdlog::error("Error setting up test database: {}", e.what());
            FAIL() << "Failed to setup test database: " << e.what();
        } catch (const std::exception& e) {
            spdlog::error("Non-SQL error setting up test database: {}", e.what());
            FAIL() << "Failed to setup test database: " << e.what();
        }

        user_repo = new UserRepository(test_db_conn_str);
        spdlog::set_level(spdlog::level::info); // Enable logging for integration tests
    }

    void TearDown() override {
        delete user_repo;
        // Clean up: drop the test database
        try {
            pqxx::connection C_admin("postgresql://user:password@localhost:5432/postgres");
            pqxx::work W_admin(C_admin);
            W_admin.exec("DROP DATABASE IF EXISTS cms_test_db WITH (FORCE);");
            W_admin.commit();
            spdlog::info("Test database 'cms_test_db' dropped.");
        } catch (const std::exception& e) {
            spdlog::error("Error tearing down test database: {}", e.what());
            // Don't FAIL here, just log, as test itself might have passed.
        }
    }
};

TEST_F(UserRepositoryIntegrationTest, CreateAndFindUser) {
    User new_user("integration_test", "integration@example.com", "hashed_password", UserRole::USER);
    
    auto created_user_opt = user_repo->create(new_user);
    ASSERT_TRUE(created_user_opt.has_value());
    User created_user = created_user_opt.value();

    ASSERT_TRUE(created_user.id.has_value());
    EXPECT_GT(created_user.id.value(), 0);
    EXPECT_EQ(created_user.username, "integration_test");
    EXPECT_EQ(created_user.email, "integration@example.com");

    auto found_user_by_id = user_repo->find_by_id(created_user.id.value());
    ASSERT_TRUE(found_user_by_id.has_value());
    EXPECT_EQ(found_user_by_id->username, "integration_test");

    auto found_user_by_email = user_repo->find_by_email("integration@example.com");
    ASSERT_TRUE(found_user_by_email.has_value());
    EXPECT_EQ(found_user_by_email->username, "integration_test");
}

TEST_F(UserRepositoryIntegrationTest, UpdateUser) {
    User new_user("update_test", "update@example.com", "hashed_password", UserRole::USER);
    auto created_user_opt = user_repo->create(new_user);
    ASSERT_TRUE(created_user_opt.has_value());
    User created_user = created_user_opt.value();

    created_user.username = "updated_name";
    created_user.role = UserRole::ADMIN;
    created_user.updated_at = std::time(nullptr); // Update timestamp

    bool updated = user_repo->update(created_user);
    EXPECT_TRUE(updated);

    auto found_user = user_repo->find_by_id(created_user.id.value());
    ASSERT_TRUE(found_user.has_value());
    EXPECT_EQ(found_user->username, "updated_name");
    EXPECT_EQ(found_user->role, UserRole::ADMIN);
}

TEST_F(UserRepositoryIntegrationTest, RemoveUser) {
    User new_user("remove_test", "remove@example.com", "hashed_password", UserRole::USER);
    auto created_user_opt = user_repo->create(new_user);
    ASSERT_TRUE(created_user_opt.has_value());
    User created_user = created_user_opt.value();

    bool removed = user_repo->remove(created_user.id.value());
    EXPECT_TRUE(removed);

    auto found_user = user_repo->find_by_id(created_user.id.value());
    EXPECT_FALSE(found_user.has_value());
}

TEST_F(UserRepositoryIntegrationTest, FindAllUsers) {
    user_repo->create(User("user1", "user1@example.com", "p1", UserRole::USER));
    user_repo->create(User("user2", "user2@example.com", "p2", UserRole::USER));
    user_repo->create(User("user3", "user3@example.com", "p3", UserRole::USER));

    std::vector<User> users = user_repo->find_all();
    EXPECT_GE(users.size(), 3); // May have users from other tests if setup is not fully isolated
}

TEST_F(UserRepositoryIntegrationTest, CountUsers) {
    long long initial_count = user_repo->count();
    user_repo->create(User("count_test", "count@example.com", "p1", UserRole::USER));
    long long new_count = user_repo->count();
    EXPECT_EQ(new_count, initial_count + 1);
}