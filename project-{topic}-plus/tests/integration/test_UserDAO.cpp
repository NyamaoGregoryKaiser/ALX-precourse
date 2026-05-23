#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/database/DBManager.h"
#include "../../src/database/UserDAO.h"
#include "../../src/models/User.h"
#include "../../src/logger/Logger.h"
#include "../../src/config/AppConfig.h" // To get DB config for connection

#include <chrono>
#include <thread>

// Test fixture for UserDAO integration tests
class UserDAOIntegrationTest : public ::testing::Test {
protected:
    UserDAO user_dao;
    DBManager& db_manager = DBManager::get_instance();

    // Setup: Ensure a clean state for each test
    void SetUp() override {
        Logger::init_logger("debug"); // Ensure logger is initialized
        Logger::get_logger()->info("UserDAOIntegrationTest SetUp: Cleaning up test data.");
        // Clear all users before each test
        try {
            db_manager.executeCommand("DELETE FROM users WHERE username LIKE 'test_user_%' OR email LIKE 'test_%@%';");
        } catch (const std::exception& e) {
            Logger::get_logger()->error("Failed to clean up test data: {}", e.what());
            // If cleanup fails, subsequent tests might be affected. Consider failing here.
        }
    }

    // Teardown: Clean up after each test
    void TearDown() override {
        Logger::get_logger()->info("UserDAOIntegrationTest TearDown: Cleaning up test data.");
        try {
            db_manager.executeCommand("DELETE FROM users WHERE username LIKE 'test_user_%' OR email LIKE 'test_%@%';");
        } catch (const std::exception& e) {
            Logger::get_logger()->error("Failed to clean up test data in TearDown: {}", e.what());
        }
    }

    User createTestUser(const std::string& suffix) {
        return User("test_user_" + suffix, "test_" + suffix + "@example.com", "hashed_pass_" + suffix, "FirstName");
    }
};

TEST_F(UserDAOIntegrationTest, CreateAndFindUserById) {
    User newUser = createTestUser("create_find");
    std::optional<User> createdUser = user_dao.createUser(newUser);

    ASSERT_TRUE(createdUser.has_value());
    ASSERT_EQ(createdUser->username, newUser.username);

    std::optional<User> foundUser = user_dao.findUserById(createdUser->id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, createdUser->id);
    ASSERT_EQ(foundUser->username, newUser.username);
    ASSERT_EQ(foundUser->email, newUser.email);
}

TEST_F(UserDAOIntegrationTest, CreateAndFindUserByUsername) {
    User newUser = createTestUser("find_by_username");
    std::optional<User> createdUser = user_dao.createUser(newUser);
    ASSERT_TRUE(createdUser.has_value());

    std::optional<User> foundUser = user_dao.findUserByUsername(newUser.username);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, createdUser->id);
    ASSERT_EQ(foundUser->username, newUser.username);
}

TEST_F(UserDAOIntegrationTest, CreateAndFindUserByEmail) {
    User newUser = createTestUser("find_by_email");
    std::optional<User> createdUser = user_dao.createUser(newUser);
    ASSERT_TRUE(createdUser.has_value());

    std::optional<User> foundUser = user_dao.findUserByEmail(newUser.email);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, createdUser->id);
    ASSERT_EQ(foundUser->email, newUser.email);
}

TEST_F(UserDAOIntegrationTest, CreateDuplicateUserThrowsException) {
    User newUser1 = createTestUser("duplicate");
    std::optional<User> createdUser1 = user_dao.createUser(newUser1);
    ASSERT_TRUE(createdUser1.has_value());

    User newUser2 = createTestUser("duplicate"); // Same username/email
    // Expect DatabaseException (specifically unique_violation re-thrown from DAO)
    ASSERT_THROW({
        user_dao.createUser(newUser2);
    }, DatabaseException);
}

TEST_F(UserDAOIntegrationTest, UpdateUser) {
    User newUser = createTestUser("update");
    std::optional<User> createdUser = user_dao.createUser(newUser);
    ASSERT_TRUE(createdUser.has_value());

    createdUser->first_name = "UpdatedFirstName";
    createdUser->last_name = "UpdatedLastName";
    createdUser->email = "updated@example.com";

    bool updated = user_dao.updateUser(*createdUser);
    ASSERT_TRUE(updated);

    std::optional<User> foundUser = user_dao.findUserById(createdUser->id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->first_name, "UpdatedFirstName");
    ASSERT_EQ(foundUser->last_name.value(), "UpdatedLastName");
    ASSERT_EQ(foundUser->email, "updated@example.com");
}

TEST_F(UserDAOIntegrationTest, DeleteUser) {
    User newUser = createTestUser("delete");
    std::optional<User> createdUser = user_dao.createUser(newUser);
    ASSERT_TRUE(createdUser.has_value());

    bool deleted = user_dao.deleteUser(createdUser->id);
    ASSERT_TRUE(deleted);

    std::optional<User> foundUser = user_dao.findUserById(createdUser->id);
    ASSERT_FALSE(foundUser.has_value());
}

TEST_F(UserDAOIntegrationTest, FindAllUsersWithPagination) {
    // Create several users
    user_dao.createUser(createTestUser("pag_1"));
    user_dao.createUser(createTestUser("pag_2"));
    user_dao.createUser(createTestUser("pag_3"));
    user_dao.createUser(createTestUser("pag_4"));
    user_dao.createUser(createTestUser("pag_5"));
    
    // Allow DB to catch up if there's any async operations or just for robustness
    std::this_thread::sleep_for(std::chrono::milliseconds(100)); 

    std::vector<User> allUsers = user_dao.findAllUsers();
    ASSERT_GE(allUsers.size(), 5); // Should have at least the 5 created users

    std::vector<User> firstTwo = user_dao.findAllUsers(2, 0);
    ASSERT_EQ(firstTwo.size(), 2);

    std::vector<User> nextTwo = user_dao.findAllUsers(2, 2);
    ASSERT_EQ(nextTwo.size(), 2);
    ASSERT_NE(firstTwo[0].id, nextTwo[0].id); // Ensure different users
}