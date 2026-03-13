#include <gtest/gtest.h>
#include "../../src/database/user_repository.hpp"
#include "../../src/common/config.hpp"
#include "../../src/common/logger.hpp"
#include "../../src/common/uuid.hpp"
#include "../../src/common/error.hpp"
#include <pqxx/pqxx>
#include <bcrypt.h> // For password hashing

// Define a test fixture for UserRepository tests
class UserRepositoryTest : public ::testing::Test {
protected:
    cms::database::UserRepository user_repo;
    std::string test_user_id;

    void SetUp() override {
        cms::common::Logger::set_level("warn"); // Suppress verbose logging during tests
        LOG_INFO("Setting up UserRepositoryTest...");

        // Clean up any lingering test data before each test
        cleanup_test_data();

        // Create a test user for CRUD operations
        cms::models::User test_user;
        test_user.username = "test_user_" + cms::common::UUID::generate_v4().substr(0, 8);
        test_user.email = "test_" + cms::common::UUID::generate_v4().substr(0, 8) + "@example.com";
        test_user.password_hash = hash_password("test_password");
        test_user.role = cms::models::UserRole::VIEWER;

        cms::models::User created_user = user_repo.create(test_user);
        test_user_id = created_user.id;
        LOG_INFO("Created test user: {} with ID {}", test_user.username, test_user_id);
    }

    void TearDown() override {
        LOG_INFO("Tearing down UserRepositoryTest.");
        cleanup_test_data();
    }

    void cleanup_test_data() {
        auto conn = cms::database::DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        W.exec("DELETE FROM users WHERE username LIKE 'test_user_%' OR email LIKE 'test_%@example.com'");
        W.commit();
        LOG_INFO("Cleaned up test user data.");
    }

    std::string hash_password(const std::string& password) {
        char salt[BCRYPT_HASH_BUFFER];
        char hash[BCRYPT_HASH_BUFFER];
        bcrypt_gensalt(10, salt);
        bcrypt_hashpw(password.c_str(), salt, hash);
        return std::string(hash);
    }
};

TEST_F(UserRepositoryTest, FindByIdReturnsCorrectUser) {
    std::optional<cms::models::User> found_user = user_repo.find_by_id(test_user_id);
    ASSERT_TRUE(found_user);
    ASSERT_EQ(found_user->id, test_user_id);
    ASSERT_TRUE(found_user->username.rfind("test_user_", 0) == 0); // Starts with "test_user_"
}

TEST_F(UserRepositoryTest, FindByIdReturnsNullOptForNonexistentUser) {
    std::string non_existent_id = cms::common::UUID::generate_v4();
    std::optional<cms::models::User> found_user = user_repo.find_by_id(non_existent_id);
    ASSERT_FALSE(found_user);
}

TEST_F(UserRepositoryTest, CreateUserSuccessfully) {
    cms::models::User new_user;
    new_user.username = "new_test_user_" + cms::common::UUID::generate_v4().substr(0, 8);
    new_user.email = "new_test_" + cms::common::UUID::generate_v4().substr(0, 8) + "@example.com";
    new_user.password_hash = hash_password("new_password");
    new_user.role = cms::models::UserRole::EDITOR;

    cms::models::User created_user = user_repo.create(new_user);
    ASSERT_FALSE(created_user.id.empty());
    ASSERT_EQ(created_user.username, new_user.username);
    ASSERT_EQ(created_user.email, new_user.email);
    ASSERT_EQ(created_user.role, cms::models::UserRole::EDITOR);

    std::optional<cms::models::User> found_user = user_repo.find_by_id(created_user.id);
    ASSERT_TRUE(found_user);
    ASSERT_EQ(found_user->username, new_user.username);
}

TEST_F(UserRepositoryTest, CreateUserWithDuplicateUsernameThrowsConflict) {
    cms::models::User new_user;
    new_user.username = "duplicate_user";
    new_user.email = "dup_user1@example.com";
    new_user.password_hash = hash_password("pass");
    new_user.role = cms::models::UserRole::VIEWER;
    user_repo.create(new_user); // First creation

    cms::models::User duplicate_user;
    duplicate_user.username = "duplicate_user"; // Same username
    duplicate_user.email = "dup_user2@example.com"; // Different email
    duplicate_user.password_hash = hash_password("pass");
    duplicate_user.role = cms::models::UserRole::VIEWER;

    ASSERT_THROW(user_repo.create(duplicate_user), cms::common::ConflictException);
}

TEST_F(UserRepositoryTest, CreateUserWithDuplicateEmailThrowsConflict) {
    cms::models::User new_user;
    new_user.username = "another_user";
    new_user.email = "dup_email@example.com";
    new_user.password_hash = hash_password("pass");
    new_user.role = cms::models::UserRole::VIEWER;
    user_repo.create(new_user); // First creation

    cms::models::User duplicate_user;
    duplicate_user.username = "another_duplicate_user"; // Different username
    duplicate_user.email = "dup_email@example.com"; // Same email
    duplicate_user.password_hash = hash_password("pass");
    duplicate_user.role = cms::models::UserRole::VIEWER;

    ASSERT_THROW(user_repo.create(duplicate_user), cms::common::ConflictException);
}

TEST_F(UserRepositoryTest, UpdateUserSuccessfully) {
    cms::models::User::UpdateFields updates;
    std::string new_username = "updated_user_" + cms::common::UUID::generate_v4().substr(0, 8);
    updates.username = new_username;
    updates.email = "updated_" + cms::common::UUID::generate_v4().substr(0, 8) + "@example.com";
    updates.role = cms::models::UserRole::ADMIN;

    std::optional<cms::models::User> updated_user = user_repo.update(test_user_id, updates);
    ASSERT_TRUE(updated_user);
    ASSERT_EQ(updated_user->id, test_user_id);
    ASSERT_EQ(updated_user->username, *updates.username);
    ASSERT_EQ(updated_user->email, *updates.email);
    ASSERT_EQ(updated_user->role, *updates.role);

    // Verify from DB again
    std::optional<cms::models::User> retrieved_user = user_repo.find_by_id(test_user_id);
    ASSERT_TRUE(retrieved_user);
    ASSERT_EQ(retrieved_user->username, *updates.username);
    ASSERT_EQ(retrieved_user->email, *updates.email);
    ASSERT_EQ(retrieved_user->role, *updates.role);
}

TEST_F(UserRepositoryTest, UpdateNonExistentUserReturnsNullOpt) {
    cms::models::User::UpdateFields updates;
    updates.username = "non_existent_username";
    std::string non_existent_id = cms::common::UUID::generate_v4();
    std::optional<cms::models::User> updated_user = user_repo.update(non_existent_id, updates);
    ASSERT_FALSE(updated_user);
}

TEST_F(UserRepositoryTest, RemoveUserSuccessfully) {
    bool removed = user_repo.remove(test_user_id);
    ASSERT_TRUE(removed);

    std::optional<cms::models::User> found_user = user_repo.find_by_id(test_user_id);
    ASSERT_FALSE(found_user);
}

TEST_F(UserRepositoryTest, RemoveNonExistentUserReturnsFalse) {
    std::string non_existent_id = cms::common::UUID::generate_v4();
    bool removed = user_repo.remove(non_existent_id);
    ASSERT_FALSE(removed);
}

TEST_F(UserRepositoryTest, FindAllReturnsMultipleUsers) {
    // Add a few more users
    for (int i = 0; i < 3; ++i) {
        cms::models::User new_user;
        new_user.username = "another_user_" + cms::common::UUID::generate_v4().substr(0, 8);
        new_user.email = "another_" + cms::common::UUID::generate_v4().substr(0, 8) + "@example.com";
        new_user.password_hash = hash_password("pass");
        new_user.role = cms::models::UserRole::VIEWER;
        user_repo.create(new_user);
    }
    
    std::vector<cms::models::User> users = user_repo.find_all(10, 0);
    // At least 4 users (the initial test_user and 3 more)
    ASSERT_GE(users.size(), 4); 
}

TEST_F(UserRepositoryTest, FindAllWithLimitAndOffset) {
    // Ensure we have enough users for pagination
    cleanup_test_data(); // Clean up to avoid interference from previous tests
    for (int i = 0; i < 5; ++i) {
        cms::models::User new_user;
        new_user.username = "paginated_user_" + std::to_string(i) + "_" + cms::common::UUID::generate_v4().substr(0, 4);
        new_user.email = "paginated_" + std::to_string(i) + "_" + cms::common::UUID::generate_v4().substr(0, 4) + "@example.com";
        new_user.password_hash = hash_password("pass");
        new_user.role = cms::models::UserRole::VIEWER;
        user_repo.create(new_user);
    }

    std::vector<cms::models::User> first_two = user_repo.find_all(2, 0);
    ASSERT_EQ(first_two.size(), 2);

    std::vector<cms::models::User> next_two = user_repo.find_all(2, 2);
    ASSERT_EQ(next_two.size(), 2);
    ASSERT_NE(first_two[0].id, next_two[0].id); // Ensure different users

    std::vector<cms::models::User> last_one = user_repo.find_all(2, 4);
    ASSERT_EQ(last_one.size(), 1);
}
```