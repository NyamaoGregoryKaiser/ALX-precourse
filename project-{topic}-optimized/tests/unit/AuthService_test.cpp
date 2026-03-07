```cpp
#include <gtest/gtest.h>
#include "../../src/services/AuthService.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <fstream>

// Global setup for tests
class AuthServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Create a temporary in-memory database or file-based for tests
        // This ensures tests are isolated and don't interfere with real data
        std::string testDbPath = "./test_db.db";
        // Delete previous test DB if it exists
        std::remove(testDbPath.c_str());

        // Setup Drogon's DB client for testing
        Json::Value dbConfig;
        dbConfig["db_type"] = "sqlite3";
        dbConfig["db_host"] = testDbPath;
        dbConfig["connections_num"] = 1;
        dbConfig["is_fast"] = true;
        dbConfig["name"] = "test_default"; // Use a distinct name for test client

        drogon::app().addDbClient(dbConfig, "test_default");
        dbClient_ = drogon::app().getDbClient("test_default");

        // Apply schema to test database
        std::ifstream schemaFile("../../db/schema.sql");
        std::string schemaSql((std::istreambuf_iterator<char>(schemaFile)),
                               std::istreambuf_iterator<char>());
        
        drogon::AsyncTask<void> setupTask = [this, schemaSql]() -> drogon::Task<void> {
            try {
                co_await dbClient_->execSqlCoro(schemaSql);
                // Set JWT secret for testing
                drogon::app().getMutableJsonConfig()["filters"]["AuthFilter"]["jwt_secret"] = "test_jwt_secret";
            } catch (const drogon::orm::DrogonDbException& e) {
                FAIL() << "Failed to apply schema: " << e.what();
            }
        }();
        drogon::app().getLoop()->queueInLoop([&setupTask]() {
            setupTask.run();
        });
        drogon::app().getLoop()->runInLoop([](){}); // Process the queued task
        drogon::app().getLoop()->queueInLoop([](){}); // Run another cycle to finish async setup

        // Instantiate AuthService
        authService_ = std::make_unique<AuthService>(dbClient_);
    }

    void TearDown() override {
        // Clean up: close DB client, delete test DB file
        drogon::app().getLoop()->queueInLoop([this]() {
            drogon::app().releaseDbClient("test_default");
        });
        drogon::app().getLoop()->runInLoop([](){});
        std::remove("./test_db.db");
    }

    drogon::orm::DbClientPtr dbClient_;
    std::unique_ptr<AuthService> authService_;
};

TEST_F(AuthServiceTest, RegisterUserSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        auto result = co_await authService_->registerUser("testuser", "test@test.com", "password123");
        EXPECT_EQ(result.first.username, "testuser");
        EXPECT_EQ(result.first.email, "test@test.com");
        EXPECT_GT(result.first.id, 0); // Check if ID is assigned
        EXPECT_FALSE(result.second.empty()); // Check if token is generated
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(AuthServiceTest, RegisterExistingUserFails) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        co_await authService_->registerUser("testuser", "test@test.com", "password123");
        
        // Attempt to register again with same email
        try {
            co_await authService_->registerUser("anotheruser", "test@test.com", "password123");
            FAIL() << "Expected HttpException for duplicate email, but it succeeded.";
        } catch (const drogon::HttpException& e) {
            EXPECT_EQ(e.statusCode(), drogon::k409Conflict);
            EXPECT_EQ(e.what(), std::string("User with this email already exists"));
        }
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(AuthServiceTest, LoginUserSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        co_await authService_->registerUser("loginuser", "login@test.com", "securepassword");
        auto token = co_await authService_->loginUser("login@test.com", "securepassword");
        EXPECT_TRUE(token.has_value());
        EXPECT_FALSE(token.value().empty());
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(AuthServiceTest, LoginUserFailureInvalidPassword) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        co_await authService_->registerUser("badpassuser", "badpass@test.com", "correctpassword");
        auto token = co_await authService_->loginUser("badpass@test.com", "wrongpassword");
        EXPECT_FALSE(token.has_value());
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(AuthServiceTest, VerifyTokenSuccess) {
    drogon::AsyncTask<void> testTask = [this]() -> drogon::Task<void> {
        auto result = co_await authService_->registerUser("tokenuser", "token@test.com", "tokenpass");
        std::string token = result.second;
        int userId = result.first.id;

        auto verifiedId = authService_->verifyToken(token);
        EXPECT_TRUE(verifiedId.has_value());
        EXPECT_EQ(verifiedId.value(), userId);
    }();
    drogon::app().getLoop()->queueInLoop([&testTask]() { testTask.run(); });
    drogon::app().getLoop()->runInLoop([](){});
    drogon::app().getLoop()->queueInLoop([](){});
}

TEST_F(AuthServiceTest, VerifyTokenFailureInvalidToken) {
    auto verifiedId = authService_->verifyToken("invalid.jwt.token");
    EXPECT_FALSE(verifiedId.has_value());
}

// More tests for findUserByEmail, findUserById, edge cases, etc.
```