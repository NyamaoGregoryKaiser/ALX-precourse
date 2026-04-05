```cpp
#include "gtest/gtest.h"
#include "../../src/models/User.hpp"
#include "../../src/database/Database.hpp"
#include "../../src/logger/Logger.hpp" // For setup

#include <memory>
#include <stdexcept>
#include <chrono>
#include <thread>
#include <vector>

// Global setup for tests
class UserTest : public ::testing::Test {
protected:
    std::unique_ptr<Database> db;
    const std::string TEST_DB_PATH = "./test_user.db";

    void SetUp() override {
        // Setup logger for tests
        Logger::setup("./test_user.log", spdlog::level::debug, false);

        // Delete old test DB file if it exists
        remove(TEST_DB_PATH.c_str());

        db = std::make_unique<Database>(TEST_DB_PATH);
        db->connect();
        
        // Create users table for testing
        db->execute("CREATE TABLE IF NOT EXISTS users ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "username TEXT NOT NULL UNIQUE,"
                    "password_hash TEXT NOT NULL,"
                    "email TEXT NOT NULL UNIQUE,"
                    "role TEXT NOT NULL DEFAULT 'user',"
                    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                    "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                    ");");
    }

    void TearDown() override {
        if (db) {
            db->disconnect();
            db.reset();
        }
        remove(TEST_DB_PATH.c_str());
        remove("./test_user.log");
    }
};

// Test User object creation and getters
TEST_F(UserTest, UserObjectCreation) {
    User user(1, "testuser", "hashedpass", "test@example.com", "user", "2023-01-01 10:00:00", "2023-01-01 10:00:00");
    ASSERT_EQ(user.getId(), 1);
    ASSERT_EQ(user.getUsername(), "testuser");
    ASSERT_EQ(user.getPasswordHash(), "hashedpass");
    ASSERT_EQ(user.getEmail(), "test@example.com");
    ASSERT_EQ(user.getRole(), "user");
    ASSERT_EQ(user.getCreatedAt(), "2023-01-01 10:00:00");
    ASSERT_EQ(user.getUpdatedAt(), "2023-01-01 10:00:00");
}

// Test User object setters and timestamp update
TEST_F(UserTest, UserObjectSetters) {
    User user(1, "testuser", "hashedpass", "test@example.com");
    std::string originalUpdatedAt = user.getUpdatedAt();
    
    std::this_thread::sleep_for(std::chrono::milliseconds(10)); // Ensure timestamp changes

    user.setUsername("newusername");
    ASSERT_EQ(user.getUsername(), "newusername");
    ASSERT_NE(user.getUpdatedAt(), originalUpdatedAt); // UpdatedAt should change

    originalUpdatedAt = user.getUpdatedAt();
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
    user.setEmail("newemail@example.com");
    ASSERT_EQ(user.getEmail(), "newemail@example.com");
    ASSERT_NE(user.getUpdatedAt(), originalUpdatedAt);

    originalUpdatedAt = user.getUpdatedAt();
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
    user.setRole("admin");
    ASSERT_EQ(user.getRole(), "admin");
    ASSERT_NE(user.getUpdatedAt(), originalUpdatedAt);

    // Invalid role
    ASSERT_THROW(user.setRole("invalid"), std::runtime_error);
}

// Test user creation in DB
TEST_F(UserTest, CreateUserInDb) {
    User newUser(0, "dbuser", "dbhashedpass", "db@example.com", "user");
    int id = User::create(*db, newUser);
    ASSERT_GT(id, 0);
    newUser.setId(id);

    std::optional<User> fetchedUser = User::findById(*db, id);
    ASSERT_TRUE(fetchedUser.has_value());
    ASSERT_EQ(fetchedUser->getUsername(), "dbuser");
    ASSERT_EQ(fetchedUser->getEmail(), "db@example.com");
}

// Test find user by ID
TEST_F(UserTest, FindUserById) {
    User newUser(0, "findid", "pass", "findid@example.com");
    int id = User::create(*db, newUser);

    std::optional<User> foundUser = User::findById(*db, id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->getId(), id);
    ASSERT_EQ(foundUser->getUsername(), "findid");

    std::optional<User> notFoundUser = User::findById(*db, 9999);
    ASSERT_FALSE(notFoundUser.has_value());
}

// Test find user by username
TEST_F(UserTest, FindUserByUsername) {
    User newUser(0, "findname", "pass", "findname@example.com");
    User::create(*db, newUser);

    std::optional<User> foundUser = User::findByUsername(*db, "findname");
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->getUsername(), "findname");

    std::optional<User> notFoundUser = User::findByUsername(*db, "nonexistent");
    ASSERT_FALSE(notFoundUser.has_value());
}

// Test find user by email
TEST_F(UserTest, FindUserByEmail) {
    User newUser(0, "findemail", "pass", "findemail@example.com");
    User::create(*db, newUser);

    std::optional<User> foundUser = User::findByEmail(*db, "findemail@example.com");
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->getEmail(), "findemail@example.com");

    std::optional<User> notFoundUser = User::findByEmail(*db, "nonexistent@example.com");
    ASSERT_FALSE(notFoundUser.has_value());
}

// Test update user
TEST_F(UserTest, UpdateUserInDb) {
    User newUser(0, "updateuser", "oldpass", "update@example.com");
    int id = User::create(*db, newUser);
    newUser.setId(id);

    newUser.setUsername("updatedusername");
    newUser.setEmail("updated@example.com");
    newUser.setPasswordHash("newhashedpass");
    newUser.setRole("admin");

    ASSERT_TRUE(User::update(*db, newUser));

    std::optional<User> updatedUser = User::findById(*db, id);
    ASSERT_TRUE(updatedUser.has_value());
    ASSERT_EQ(updatedUser->getUsername(), "updatedusername");
    ASSERT_EQ(updatedUser->getEmail(), "updated@example.com");
    ASSERT_EQ(updatedUser->getPasswordHash(), "newhashedpass");
    ASSERT_EQ(updatedUser->getRole(), "admin");
}

// Test delete user
TEST_F(UserTest, DeleteUserFromDb) {
    User newUser(0, "deleteuser", "pass", "delete@example.com");
    int id = User::create(*db, newUser);

    ASSERT_TRUE(User::remove(*db, id));

    std::optional<User> deletedUser = User::findById(*db, id);
    ASSERT_FALSE(deletedUser.has_value());
}

// Test find all users
TEST_F(UserTest, FindAllUsers) {
    User::create(*db, User(0, "user1", "p1", "u1@e.com"));
    User::create(*db, User(0, "user2", "p2", "u2@e.com"));
    User::create(*db, User(0, "user3", "p3", "u3@e.com"));

    std::vector<User> users = User::findAll(*db);
    ASSERT_EQ(users.size(), 3); // Check count
}
```