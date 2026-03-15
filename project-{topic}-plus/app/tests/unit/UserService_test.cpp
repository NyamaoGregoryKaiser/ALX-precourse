#include <gtest/gtest.h>
#include <SQLiteCpp/SQLiteCpp.h>
#include "../../src/services/UserService.h"
#include "../../src/utils/Database.h"
#include "../../src/utils/ErrorHandler.h"
#include "../../src/app_config.h"
#include <fstream>
#include <thread>
#include <chrono>

// Use a unique test database for each test suite or fixture
class UserServiceTest : public ::testing::Test {
protected:
    Database& db_instance = Database::getTestInstance();
    UserService* user_service;

    void SetUp() override {
        // Initialize the test database before each test
        db_instance.applySchemaAndSeed("db/schema.sql", "db/seed.sql");
        user_service = new UserService(db_instance);
        LOG_INFO("UserServiceTest Setup complete.");
    }

    void TearDown() override {
        delete user_service;
        // Clean up the test database (optional, but good practice for isolation)
        // db_instance.execute("DELETE FROM users;"); // Or delete the file
        LOG_INFO("UserServiceTest TearDown complete.");
    }
};

// Test case for creating a user
TEST_F(UserServiceTest, CreateUserSuccessfully) {
    LOG_INFO("Running test: CreateUserSuccessfully");
    User new_user = user_service->createUser("testuser", "test@example.com", "password123", AppConfig::ROLE_USER);

    ASSERT_GT(new_user.id, 0); // Check if ID is assigned
    ASSERT_EQ(new_user.username, "testuser");
    ASSERT_EQ(new_user.email, "test@example.com");
    ASSERT_EQ(new_user.role, AppConfig::ROLE_USER);

    // Verify user exists in DB
    auto fetched_user = user_service->getUserById(new_user.id);
    ASSERT_TRUE(fetched_user.has_value());
    ASSERT_EQ(fetched_user->username, "testuser");
}

// Test case for creating user with duplicate username
TEST_F(UserServiceTest, CreateUserWithDuplicateUsernameFails) {
    LOG_INFO("Running test: CreateUserWithDuplicateUsernameFails");
    user_service->createUser("john_doe_new", "unique@example.com", "password123", AppConfig::ROLE_USER);
    
    // Attempt to create another user with the same username
    ASSERT_THROW(
        user_service->createUser("john_doe_new", "another@example.com", "password123", AppConfig::ROLE_USER),
        ConflictException
    );
}

// Test case for creating user with duplicate email
TEST_F(UserServiceTest, CreateUserWithDuplicateEmailFails) {
    LOG_INFO("Running test: CreateUserWithDuplicateEmailFails");
    user_service->createUser("new_user_unique", "jane.smith@example.com", "password123", AppConfig::ROLE_USER);

    // Attempt to create another user with the same email
    ASSERT_THROW(
        user_service->createUser("another_unique", "jane.smith@example.com", "password123", AppConfig::ROLE_USER),
        ConflictException
    );
}

// Test case for creating user with weak password
TEST_F(UserServiceTest, CreateUserWithWeakPasswordFails) {
    LOG_INFO("Running test: CreateUserWithWeakPasswordFails");
    ASSERT_THROW(
        user_service->createUser("weakpassuser", "weak@example.com", "short", AppConfig::ROLE_USER),
        BadRequestException
    );
}

// Test case for getting a user by ID
TEST_F(UserServiceTest, GetUserByIdSuccessfully) {
    LOG_INFO("Running test: GetUserByIdSuccessfully");
    // john_doe is in seed data, ID 2
    auto user = user_service->getUserById(2);
    ASSERT_TRUE(user.has_value());
    ASSERT_EQ(user->username, "john_doe");
}

// Test case for getting a non-existent user
TEST_F(UserServiceTest, GetNonExistentUserByIdReturnsNullOpt) {
    LOG_INFO("Running test: GetNonExistentUserByIdReturnsNullOpt");
    auto user = user_service->getUserById(999);
    ASSERT_FALSE(user.has_value());
}

// Test case for finding user by username
TEST_F(UserServiceTest, FindByUsernameSuccessfully) {
    LOG_INFO("Running test: FindByUsernameSuccessfully");
    auto user = user_service->findByUsername("admin");
    ASSERT_TRUE(user.has_value());
    ASSERT_EQ(user->email, "admin@example.com");
}

// Test case for finding non-existent username
TEST_F(UserServiceTest, FindByNonExistentUsernameReturnsNullOpt) {
    LOG_INFO("Running test: FindByNonExistentUsernameReturnsNullOpt");
    auto user = user_service->findByUsername("nonexistent");
    ASSERT_FALSE(user.has_value());
}

// Test case for updating user email
TEST_F(UserServiceTest, UpdateUserEmailSuccessfully) {
    LOG_INFO("Running test: UpdateUserEmailSuccessfully");
    long long user_id = user_service->findByUsername("john_doe")->id;
    std::string new_email = "john.updated@example.com";

    User updated_user = user_service->updateUser(user_id, new_email, std::nullopt, std::nullopt);
    ASSERT_EQ(updated_user.email, new_email);

    auto fetched_user = user_service->getUserById(user_id);
    ASSERT_TRUE(fetched_user.has_value());
    ASSERT_EQ(fetched_user->email, new_email);
}

// Test case for updating user with duplicate email
TEST_F(UserServiceTest, UpdateUserWithDuplicateEmailFails) {
    LOG_INFO("Running test: UpdateUserWithDuplicateEmailFails");
    long long john_doe_id = user_service->findByUsername("john_doe")->id;
    std::string existing_email = "jane.smith@example.com"; // Email already used by jane_smith

    ASSERT_THROW(
        user_service->updateUser(john_doe_id, existing_email, std::nullopt, std::nullopt),
        ConflictException
    );
}

// Test case for updating user password
TEST_F(UserServiceTest, UpdateUserPasswordSuccessfully) {
    LOG_INFO("Running test: UpdateUserPasswordSuccessfully");
    long long user_id = user_service->findByUsername("john_doe")->id;
    std::string new_password = "newsecurepassword123";

    User updated_user = user_service->updateUser(user_id, std::nullopt, new_password, std::nullopt);
    // Cannot directly verify password_hash here due to hashing, rely on login test for verification
    // For unit testing, you might mock the hash_password function or have a separate Auth test.
    
    // Verify through login (conceptual, usually handled by AuthService)
    ASSERT_TRUE(verify_password(new_password, updated_user.password_hash));
}

// Test case for updating non-existent user
TEST_F(UserServiceTest, UpdateNonExistentUserFails) {
    LOG_INFO("Running test: UpdateNonExistentUserFails");
    ASSERT_THROW(
        user_service->updateUser(999, "nonexistent@example.com", "password123", std::nullopt),
        NotFoundException
    );
}

// Test case for deleting a user
TEST_F(UserServiceTest, DeleteUserSuccessfully) {
    LOG_INFO("Running test: DeleteUserSuccessfully");
    long long user_id = user_service->findByUsername("jane_smith")->id;

    ASSERT_TRUE(user_service->deleteUser(user_id));
    ASSERT_FALSE(user_service->getUserById(user_id).has_value()); // Verify user is gone
}

// Test case for deleting a non-existent user
TEST_F(UserServiceTest, DeleteNonExistentUserFails) {
    LOG_INFO("Running test: DeleteNonExistentUserFails");
    ASSERT_THROW(
        user_service->deleteUser(999),
        NotFoundException
    );
}

// Test case for getAllUsers
TEST_F(UserServiceTest, GetAllUsersReturnsAllUsers) {
    LOG_INFO("Running test: GetAllUsersReturnsAllUsers");
    std::vector<User> users = user_service->getAllUsers();
    // Assuming 3 users in seed data
    ASSERT_EQ(users.size(), 3);
    
    // Verify at least one known user is present
    bool found_admin = false;
    for (const auto& user : users) {
        if (user.username == "admin") {
            found_admin = true;
            break;
        }
    }
    ASSERT_TRUE(found_admin);
}