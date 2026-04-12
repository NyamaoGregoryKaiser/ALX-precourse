#include "gtest/gtest.h"
#include "database/DatabaseManager.h"
#include "database/UserRepository.h"
#include "models/User.h"
#include "utils/Logger.h" // Include for logging in tests

// Helper to clear table data before each test that modifies the DB
void clear_users_table() {
    soci::session sql = DatabaseManager::get_session();
    try {
        sql << "DELETE FROM users WHERE username LIKE 'test_user_%' OR username = 'admin'"; // Clear only test data
        LOG_DEBUG("Cleared test user data from 'users' table.");
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error clearing users table: {}", e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
}

class UserRepositoryTest : public ::testing::Test {
protected:
    UserRepository user_repo;

    void SetUp() override {
        clear_users_table(); // Ensure a clean state
    }
    void TearDown() override {
        // No additional cleanup needed, SetUp handles it.
    }
};

TEST_F(UserRepositoryTest, CreateUserSuccess) {
    User newUser;
    newUser.username = "test_user_create";
    newUser.email = "create@example.com";
    newUser.password_hash = "hashed_password";
    newUser.role = UserRole::USER;

    auto createdUser = user_repo.create_user(newUser);
    ASSERT_TRUE(createdUser);
    ASSERT_GT(createdUser->id, 0);
    ASSERT_EQ(createdUser->username, newUser.username);
    ASSERT_EQ(createdUser->email, newUser.email);
    ASSERT_EQ(createdUser->password_hash, newUser.password_hash);
    ASSERT_EQ(createdUser->role, newUser.role);
}

TEST_F(UserRepositoryTest, CreateUserDuplicateUsernameFails) {
    User newUser1;
    newUser1.username = "test_user_duplicate";
    newUser1.email = "dup1@example.com";
    newUser1.password_hash = "hashed_password";
    user_repo.create_user(newUser1);

    User newUser2;
    newUser2.username = "test_user_duplicate"; // Same username
    newUser2.email = "dup2@example.com";
    newUser2.password_hash = "another_hashed_password";

    auto createdUser = user_repo.create_user(newUser2);
    ASSERT_FALSE(createdUser); // Should fail due to unique constraint
}

TEST_F(UserRepositoryTest, FindById) {
    User newUser;
    newUser.username = "test_user_findbyid";
    newUser.email = "findbyid@example.com";
    newUser.password_hash = "hashed_password";
    auto createdUser = user_repo.create_user(newUser);
    ASSERT_TRUE(createdUser);

    auto foundUser = user_repo.find_by_id(createdUser->id);
    ASSERT_TRUE(foundUser);
    ASSERT_EQ(foundUser->id, createdUser->id);
    ASSERT_EQ(foundUser->username, createdUser->username);

    ASSERT_FALSE(user_repo.find_by_id(99999)); // Non-existent ID
}

TEST_F(UserRepositoryTest, FindByUsername) {
    User newUser;
    newUser.username = "test_user_findbyusername";
    newUser.email = "findbyusername@example.com";
    newUser.password_hash = "hashed_password";
    auto createdUser = user_repo.create_user(newUser);
    ASSERT_TRUE(createdUser);

    auto foundUser = user_repo.find_by_username(createdUser->username);
    ASSERT_TRUE(foundUser);
    ASSERT_EQ(foundUser->id, createdUser->id);
    ASSERT_EQ(foundUser->username, createdUser->username);

    ASSERT_FALSE(user_repo.find_by_username("non_existent_user"));
}

TEST_F(UserRepositoryTest, UpdateUser) {
    User newUser;
    newUser.username = "test_user_update";
    newUser.email = "update@example.com";
    newUser.password_hash = "old_hash";
    auto createdUser = user_repo.create_user(newUser);
    ASSERT_TRUE(createdUser);

    createdUser->email = "updated@example.com";
    createdUser->password_hash = "new_hash";
    createdUser->role = UserRole::ADMIN;

    bool success = user_repo.update_user(createdUser.value());
    ASSERT_TRUE(success);

    auto updatedUser = user_repo.find_by_id(createdUser->id);
    ASSERT_TRUE(updatedUser);
    ASSERT_EQ(updatedUser->email, "updated@example.com");
    ASSERT_EQ(updatedUser->password_hash, "new_hash");
    ASSERT_EQ(updatedUser->role, UserRole::ADMIN);
}

TEST_F(UserRepositoryTest, DeleteUser) {
    User newUser;
    newUser.username = "test_user_delete";
    newUser.email = "delete@example.com";
    newUser.password_hash = "hashed_password";
    auto createdUser = user_repo.create_user(newUser);
    ASSERT_TRUE(createdUser);

    bool success = user_repo.delete_user(createdUser->id);
    ASSERT_TRUE(success);

    auto foundUser = user_repo.find_by_id(createdUser->id);
    ASSERT_FALSE(foundUser); // Should no longer exist

    ASSERT_FALSE(user_repo.delete_user(99999)); // Deleting non-existent should fail
}