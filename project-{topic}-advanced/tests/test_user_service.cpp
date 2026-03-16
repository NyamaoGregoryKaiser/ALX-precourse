```cpp
#include "gtest/gtest.h"
#include "../src/services/user_service.h"
#include "../src/services/auth_service.h" // For hashing passwords
#include "../src/utils/database.h"
#include "../src/utils/cache.h"
#include <string>
#include <vector>
#include <optional>
#include <filesystem>

namespace fs = std::filesystem;
using namespace mobile_backend::utils;
using namespace mobile_backend::services;
using namespace mobile_backend::models;

// Integration-like tests for UserService with real DB and Cache
class UserServiceTest : public ::testing::Test {
protected:
    std::string test_db_path = "test_user_service.db";
    Database& db_instance = Database::get_instance();
    Cache<User> user_cache_instance = Cache<User>(std::chrono::seconds(10)); // 10s TTL for tests
    UserService* user_service;

    void SetUp() override {
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        db_instance.initialize(test_db_path);
        user_cache_instance.clear(); // Clear cache for each test
        user_service = new UserService(db_instance, user_cache_instance);

        // Seed some data for tests
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('user1', 'user1@example.com', ?);", {AuthService::hash_password("password123")});
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('user2', 'user2@example.com', ?);", {AuthService::hash_password("password123")});
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('user_to_update', 'update@example.com', ?);", {AuthService::hash_password("password123")});
        db_instance.execute_query("INSERT INTO users (username, email, password_hash) VALUES ('user_to_delete', 'delete@example.com', ?);", {AuthService::hash_password("password123")});
    }

    void TearDown() override {
        delete user_service;
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
    }
    
    // Helper to get user ID by username (assuming unique username)
    int get_user_id_by_username(const std::string& username) {
        auto results = db_instance.fetch_query("SELECT id FROM users WHERE username = ?;", {username});
        if (!results.empty()) {
            return std::stoi(results[0].columns[0].second);
        }
        return -1;
    }
};

TEST_F(UserServiceTest, GetUserByIdSuccess) {
    int user1_id = get_user_id_by_username("user1");
    ASSERT_GT(user1_id, 0);

    std::optional<User> user = user_service->get_user_by_id(user1_id);
    ASSERT_TRUE(user.has_value());
    ASSERT_EQ(user->username, "user1");
    ASSERT_EQ(user->email, "user1@example.com");
    ASSERT_EQ(user->id, user1_id);

    // Verify cache hit
    std::optional<User> cached_user = user_cache_instance.get("user_id_" + std::to_string(user1_id));
    ASSERT_TRUE(cached_user.has_value());
    ASSERT_EQ(cached_user->username, "user1");
}

TEST_F(UserServiceTest, GetUserByIdNotFound) {
    std::optional<User> user = user_service->get_user_by_id(9999);
    ASSERT_FALSE(user.has_value());
}

TEST_F(UserServiceTest, GetUserByIdInvalidId) {
    std::optional<User> user = user_service->get_user_by_id(0);
    ASSERT_FALSE(user.has_value());
    user = user_service->get_user_by_id(-1);
    ASSERT_FALSE(user.has_value());
}

TEST_F(UserServiceTest, GetUserByUsernameSuccess) {
    std::optional<User> user = user_service->get_user_by_username("user2");
    ASSERT_TRUE(user.has_value());
    ASSERT_EQ(user->username, "user2");
    ASSERT_EQ(user->email, "user2@example.com");
    
    // Check if it's cached by ID after fetching by username
    std::optional<User> cached_user = user_cache_instance.get("user_id_" + std::to_string(user->id));
    ASSERT_TRUE(cached_user.has_value());
}

TEST_F(UserServiceTest, GetUserByUsernameNotFound) {
    std::optional<User> user = user_service->get_user_by_username("nonexistent");
    ASSERT_FALSE(user.has_value());
}

TEST_F(UserServiceTest, GetUserByUsernameEmpty) {
    std::optional<User> user = user_service->get_user_by_username("");
    ASSERT_FALSE(user.has_value());
}

TEST_F(UserServiceTest, UpdateUserSuccessUsername) {
    int user_to_update_id = get_user_id_by_username("user_to_update");
    ASSERT_GT(user_to_update_id, 0);

    User updated_user = user_service->update_user(user_to_update_id, std::make_optional("updated_username"), std::nullopt);
    ASSERT_EQ(updated_user.username, "updated_username");
    ASSERT_EQ(updated_user.email, "update@example.com"); // Email should be unchanged

    // Verify in DB
    auto results = db_instance.fetch_query("SELECT username FROM users WHERE id = ?;", {std::to_string(user_to_update_id)});
    ASSERT_EQ(results[0].columns[0].second, "updated_username");

    // Verify cache invalidated
    std::optional<User> cached_user = user_cache_instance.get("user_id_" + std::to_string(user_to_update_id));
    ASSERT_FALSE(cached_user.has_value());
}

TEST_F(UserServiceTest, UpdateUserSuccessEmail) {
    int user_to_update_id = get_user_id_by_username("user_to_update"); // Already updated username, fine for email update
    
    User updated_user = user_service->update_user(user_to_update_id, std::nullopt, std::make_optional("updated_email@example.com"));
    ASSERT_EQ(updated_user.username, "updated_username"); // Should retain previous update
    ASSERT_EQ(updated_user.email, "updated_email@example.com");

    // Verify in DB
    auto results = db_instance.fetch_query("SELECT email FROM users WHERE id = ?;", {std::to_string(user_to_update_id)});
    ASSERT_EQ(results[0].columns[0].second, "updated_email@example.com");
}

TEST_F(UserServiceTest, UpdateUserSuccessBoth) {
    int new_user_id = get_user_id_by_username("user1"); // Use user1 for a fresh update
    User updated_user = user_service->update_user(new_user_id, std::make_optional("user1_new_name"), std::make_optional("user1_new_email@example.com"));
    ASSERT_EQ(updated_user.username, "user1_new_name");
    ASSERT_EQ(updated_user.email, "user1_new_email@example.com");
}


TEST_F(UserServiceTest, UpdateUserDuplicateUsername) {
    int user1_id = get_user_id_by_username("user1");
    int user2_id = get_user_id_by_username("user2");

    // Try to update user1 to user2's username
    ASSERT_THROW(user_service->update_user(user1_id, std::make_optional("user2"), std::nullopt), UserServiceException);
}

TEST_F(UserServiceTest, UpdateUserDuplicateEmail) {
    int user1_id = get_user_id_by_username("user1");
    int user2_id = get_user_id_by_username("user2");

    // Try to update user1 to user2's email
    ASSERT_THROW(user_service->update_user(user1_id, std::nullopt, std::make_optional("user2@example.com")), UserServiceException);
}

TEST_F(UserServiceTest, UpdateUserNoFieldsProvided) {
    int user1_id = get_user_id_by_username("user1");
    ASSERT_THROW(user_service->update_user(user1_id, std::nullopt, std::nullopt), UserServiceException);
}

TEST_F(UserServiceTest, UpdateUserNotFound) {
    ASSERT_THROW(user_service->update_user(9999, std::make_optional("newname"), std::nullopt), UserServiceException);
}

TEST_F(UserServiceTest, UpdateUserPasswordSuccess) {
    int user1_id = get_user_id_by_username("user1");
    user_service->update_user_password(user1_id, "new_secure_password");

    // Verify password change via AuthService login
    AuthService test_auth_service(db_instance, JwtManager(TEST_JWT_SECRET_AUTH));
    std::string token = test_auth_service.login_user("user1", "new_secure_password");
    ASSERT_FALSE(token.empty());

    // Original password should fail
    ASSERT_THROW(test_auth_service.login_user("user1", "password123"), AuthException);
}

TEST_F(UserServiceTest, UpdateUserPasswordInvalidId) {
    ASSERT_THROW(user_service->update_user_password(0, "password"), UserServiceException);
    ASSERT_THROW(user_service->update_user_password(9999, "password"), UserServiceException);
}

TEST_F(UserServiceTest, UpdateUserPasswordShortPassword) {
    int user1_id = get_user_id_by_username("user1");
    ASSERT_THROW(user_service->update_user_password(user1_id, "short"), UserServiceException);
}

TEST_F(UserServiceTest, DeleteUserSuccess) {
    int user_to_delete_id = get_user_id_by_username("user_to_delete");
    ASSERT_GT(user_to_delete_id, 0);

    user_service->delete_user(user_to_delete_id);

    // Verify deleted from DB
    auto results = db_instance.fetch_query("SELECT COUNT(*) FROM users WHERE id = ?;", {std::to_string(user_to_delete_id)});
    ASSERT_EQ(results[0].columns[0].second, "0");

    // Verify cache invalidated
    std::optional<User> cached_user = user_cache_instance.get("user_id_" + std::to_string(user_to_delete_id));
    ASSERT_FALSE(cached_user.has_value());
}

TEST_F(UserServiceTest, DeleteUserNotFound) {
    ASSERT_THROW(user_service->delete_user(9999), UserServiceException);
}

TEST_F(UserServiceTest, DeleteUserInvalidId) {
    ASSERT_THROW(user_service->delete_user(0), UserServiceException);
}
```