#include <gtest/gtest.h>
#include "users/UserRepository.h"
#include "database/SQLiteManager.h"
#include "database/MigrationManager.h"
#include "utils/Logger.h" // For test logger setup
#include "utils/Hasher.h" // For password hashing in setup
#include <filesystem>

namespace fs = std::filesystem;

// Test fixture for UserRepository
class UserRepositoryTest : public ::testing::Test {
protected:
    std::string testDbPath = "test_user_repo.db";
    std::shared_ptr<tm_api::database::SQLiteManager> dbManager;
    std::unique_ptr<tm_api::users::UserRepository> userRepository;

    void SetUp() override {
        // Initialize logger for tests
        tm_api::utils::Logger::init(spdlog::level::off);

        // Clean up any previous test database file
        if (fs::exists(testDbPath)) {
            fs::remove(testDbPath);
        }

        dbManager = std::make_shared<tm_api::database::SQLiteManager>(testDbPath);
        
        // Run migrations to set up schema
        tm_api::database::MigrationManager::runMigrations(testDbPath);
        
        userRepository = std::make_unique<tm_api::users::UserRepository>(dbManager);
    }

    void TearDown() override {
        dbManager->close();
        if (fs::exists(testDbPath)) {
            fs::remove(testDbPath);
        }
    }
};

TEST_F(UserRepositoryTest, CreateUser) {
    tm_api::models::User user;
    user.id = "new-user-id-1";
    user.username = "testuser";
    user.email = "test@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("password123");
    user.role = "user";

    auto createdUser = userRepository->create(user);
    ASSERT_TRUE(createdUser.has_value());
    ASSERT_EQ(createdUser->id, user.id);
    ASSERT_EQ(createdUser->username, user.username);
    ASSERT_EQ(createdUser->email, user.email);
    // passwordHash should not be returned directly, or should be null/empty
    ASSERT_TRUE(createdUser->passwordHash.empty());
    ASSERT_EQ(createdUser->role, user.role);
}

TEST_F(UserRepositoryTest, FindById) {
    tm_api::models::User user;
    user.id = "find-user-id-1";
    user.username = "find_user";
    user.email = "find@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("secure");
    user.role = "user";
    userRepository->create(user);

    auto foundUser = userRepository->findById(user.id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, user.id);
    ASSERT_EQ(foundUser->username, user.username);
    ASSERT_EQ(foundUser->email, user.email);
}

TEST_F(UserRepositoryTest, FindByUsername) {
    tm_api::models::User user;
    user.id = "username-user-id-1";
    user.username = "username_test";
    user.email = "username@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("secure");
    user.role = "user";
    userRepository->create(user);

    auto foundUser = userRepository->findByUsername(user.username);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, user.id);
    ASSERT_EQ(foundUser->username, user.username);
    ASSERT_EQ(foundUser->email, user.email);
}

TEST_F(UserRepositoryTest, UpdateUser) {
    tm_api::models::User user;
    user.id = "update-user-id-1";
    user.username = "old_name";
    user.email = "old@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("pass");
    user.role = "user";
    userRepository->create(user);

    user.username = "new_name";
    user.email = "new@example.com";
    user.role = "admin"; // Can update role
    user.passwordHash = tm_api::utils::Hasher::hashPassword("newpass"); // Password update not handled by general update

    auto updatedUser = userRepository->update(user);
    ASSERT_TRUE(updatedUser.has_value());
    ASSERT_EQ(updatedUser->username, "new_name");
    ASSERT_EQ(updatedUser->email, "new@example.com");
    ASSERT_EQ(updatedUser->role, "admin");

    auto foundUser = userRepository->findById(user.id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->username, "new_name");
    ASSERT_EQ(foundUser->email, "new@example.com");
    ASSERT_EQ(foundUser->role, "admin");
}

TEST_F(UserRepositoryTest, DeleteUser) {
    tm_api::models::User user;
    user.id = "delete-user-id-1";
    user.username = "user_to_delete";
    user.email = "delete@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("pass");
    user.role = "user";
    userRepository->create(user);

    ASSERT_TRUE(userRepository->findById(user.id).has_value());
    ASSERT_TRUE(userRepository->remove(user.id));
    ASSERT_FALSE(userRepository->findById(user.id).has_value());
}

TEST_F(UserRepositoryTest, GetAllUsers) {
    tm_api::models::User user1;
    user1.id = "all-user-1"; user1.username = "all_user_1"; user1.email = "all1@ex.com";
    user1.passwordHash = tm_api::utils::Hasher::hashPassword("p1"); user1.role = "user";
    userRepository->create(user1);

    tm_api::models::User user2;
    user2.id = "all-user-2"; user2.username = "all_user_2"; user2.email = "all2@ex.com";
    user2.passwordHash = tm_api::utils::Hasher::hashPassword("p2"); user2.role = "admin";
    userRepository->create(user2);

    auto users = userRepository->findAll();
    ASSERT_EQ(users.size(), 2); // Assuming no seed data adds users to this test db.
                               // If seed data adds, adjust expectation.
}

TEST_F(UserRepositoryTest, FindByEmail) {
    tm_api::models::User user;
    user.id = "email-user-id-1";
    user.username = "email_user";
    user.email = "email@example.com";
    user.passwordHash = tm_api::utils::Hasher::hashPassword("secure");
    user.role = "user";
    userRepository->create(user);

    auto foundUser = userRepository->findByEmail(user.email);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->id, user.id);
    ASSERT_EQ(foundUser->username, user.username);
    ASSERT_EQ(foundUser->email, user.email);
}