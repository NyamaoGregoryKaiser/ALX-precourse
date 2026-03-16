```cpp
#include "gtest/gtest.h"
#include "../src/services/auth_service.h"
#include "../src/utils/database.h"
#include "../src/utils/jwt_manager.h"
#include "../src/utils/cache.h"
#include <string>
#include <vector>
#include <filesystem>

namespace fs = std::filesystem;
using namespace mobile_backend::utils;
using namespace mobile_backend::services;
using namespace mobile_backend::models;

// Mock the Database and JwtManager for AuthService testing
// For this comprehensive example, we'll actually use the real Database singleton
// and a real JwtManager instance, but ensure to use a test DB path.
// This makes these tests more like integration tests for the service layer.

const std::string TEST_JWT_SECRET_AUTH = "test_auth_service_secret_key_for_jwt_test_purposes_123";

class AuthServiceTest : public ::testing::Test {
protected:
    std::string test_db_path = "test_auth_service.db";
    Database& db_instance = Database::get_instance();
    JwtManager jwt_manager_instance = JwtManager(TEST_JWT_SECRET_AUTH);
    AuthService* auth_service;

    void SetUp() override {
        // Clear previous test database
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        // Re-initialize database for each test
        db_instance.initialize(test_db_path);
        auth_service = new AuthService(db_instance, jwt_manager_instance);
    }

    void TearDown() override {
        delete auth_service;
        // Close DB and delete file (handled by Database destructor on application exit, but explicit here for testing)
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
    }
};

TEST_F(AuthServiceTest, HashAndPasswordVerification) {
    std::string password = "mysecurepassword";
    std::string hashed_password = AuthService::hash_password(password);
    ASSERT_FALSE(hashed_password.empty());
    ASSERT_NE(password, hashed_password); // Should not be plain text

    ASSERT_TRUE(AuthService::verify_password(password, hashed_password));
    ASSERT_FALSE(AuthService::verify_password("wrongpassword", hashed_password));
}

TEST_F(AuthServiceTest, RegisterUserSuccess) {
    User user = auth_service->register_user("newuser", "new@example.com", "password123");
    ASSERT_GT(user.id, 0);
    ASSERT_EQ(user.username, "newuser");
    ASSERT_EQ(user.email, "new@example.com");

    // Verify user exists in DB
    auto results = db_instance.fetch_query("SELECT COUNT(*) FROM users WHERE username = ?;", {"newuser"});
    ASSERT_EQ(results[0].columns[0].second, "1");
}

TEST_F(AuthServiceTest, RegisterUserDuplicateUsername) {
    auth_service->register_user("dupuser", "dup1@example.com", "password123");
    ASSERT_THROW(auth_service->register_user("dupuser", "dup2@example.com", "password456"), AuthException);
}

TEST_F(AuthServiceTest, RegisterUserDuplicateEmail) {
    auth_service->register_user("user1", "dup@example.com", "password123");
    ASSERT_THROW(auth_service->register_user("user2", "dup@example.com", "password456"), AuthException);
}

TEST_F(AuthServiceTest, RegisterUserEmptyFields) {
    ASSERT_THROW(auth_service->register_user("", "empty@example.com", "password"), AuthException);
    ASSERT_THROW(auth_service->register_user("emptyuser", "", "password"), AuthException);
    ASSERT_THROW(auth_service->register_user("emptyuser", "empty@example.com", ""), AuthException);
}

TEST_F(AuthServiceTest, RegisterUserShortPassword) {
    ASSERT_THROW(auth_service->register_user("shortpwd", "short@example.com", "short"), AuthException);
}

TEST_F(AuthServiceTest, LoginUserSuccessWithUsername) {
    auth_service->register_user("loginuser", "login@example.com", "loginpwd");
    std::string token = auth_service->login_user("loginuser", "loginpwd");
    ASSERT_FALSE(token.empty());

    // Verify token validity
    std::optional<int> user_id = jwt_manager_instance.verify_token(token);
    ASSERT_TRUE(user_id.has_value());
    
    auto results = db_instance.fetch_query("SELECT id FROM users WHERE username = ?;", {"loginuser"});
    ASSERT_EQ(std::to_string(user_id.value()), results[0].columns[0].second);
}

TEST_F(AuthServiceTest, LoginUserSuccessWithEmail) {
    auth_service->register_user("loginemail", "loginemail@example.com", "loginpwd");
    std::string token = auth_service->login_user("loginemail@example.com", "loginpwd");
    ASSERT_FALSE(token.empty());

    std::optional<int> user_id = jwt_manager_instance.verify_token(token);
    ASSERT_TRUE(user_id.has_value());
}

TEST_F(AuthServiceTest, LoginUserInvalidPassword) {
    auth_service->register_user("badpwduser", "badpwd@example.com", "correctpwd");
    ASSERT_THROW(auth_service->login_user("badpwduser", "wrongpwd"), AuthException);
}

TEST_F(AuthServiceTest, LoginUserNonExistent) {
    ASSERT_THROW(auth_service->login_user("nonexistent", "anypassword"), AuthException);
}

TEST_F(AuthServiceTest, LoginUserEmptyFields) {
    ASSERT_THROW(auth_service->login_user("", "password"), AuthException);
    ASSERT_THROW(auth_service->login_user("user", ""), AuthException);
}
```