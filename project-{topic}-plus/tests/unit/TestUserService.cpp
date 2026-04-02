```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/services/UserService.h"
#include "../../src/database/Database.h"
#include "../../src/cache/Cache.h"
#include "../../src/config/AppConfig.h"
#include "../../src/utils/Logger.h"
#include "../../src/utils/StringUtil.h"
#include <filesystem>

namespace fs = std::filesystem;

// Mock the Database for unit testing the service logic
class MockDatabase : public TaskManager::Database::Database {
public:
    MOCK_METHOD(void, connect, (const std::string& dbPath), (override));
    MOCK_METHOD(void, disconnect, (), (override));
    MOCK_METHOD(void, execute, (const std::string& sql), (override));
    MOCK_METHOD(TaskManager::Database::ResultSet, query, (const std::string& sql), (override));
    MOCK_METHOD(TaskManager::Database::ResultSet, preparedQuery, (const std::string& sql, const std::vector<std::string>& params), (override));
    MOCK_METHOD(void, preparedExecute, (const std::string& sql, const std::vector<std::string>& params), (override));
    MOCK_METHOD(long long, getLastInsertRowId, (), (override));
    MOCK_METHOD(void, beginTransaction, (), (override));
    MOCK_METHOD(void, commitTransaction, (), (override));
    MOCK_METHOD(void, rollbackTransaction, (), (override));
};

// Use a real Cache for integration with the service
class UserServiceTest : public ::testing::Test {
protected:
    MockDatabase mock_db;
    TaskManager::Cache::Cache& cache = TaskManager::Cache::Cache::getInstance();
    TaskManager::Config::AppConfig& config = TaskManager::Config::AppConfig::getInstance();
    TaskManager::Services::UserService* user_service;

    void SetUp() override {
        TaskManager::Utils::Logger::init("off"); // Turn off logging for tests
        config.load(".env.example"); // Load example config
        cache.init(1); // Small TTL for quick cache expiry
        user_service = new TaskManager::Services::UserService(mock_db, cache);
    }

    void TearDown() override {
        delete user_service;
        cache.clear();
    }
};

TEST_F(UserServiceTest, CreateUserSuccess) {
    TaskManager::Models::User new_user;
    new_user.username = "testuser";
    new_user.password_hash = "plain_password"; // Service will hash this
    new_user.email = "test@example.com";
    new_user.role = TaskManager::Models::UserRole::USER;

    // Mock getUserByUsername to return nullopt (user does not exist)
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username"),
        ::testing::An<const std::vector<std::string>&>()
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{}));

    // Mock preparedExecute for insertion
    EXPECT_CALL(mock_db, preparedExecute(
        ::testing::StartsWith("INSERT INTO users"),
        ::testing::SizeIs(6)
    )).WillOnce(::testing::Return());

    // Mock getLastInsertRowId
    EXPECT_CALL(mock_db, getLastInsertRowId()).WillOnce(::testing::Return(1));

    TaskManager::Models::User created_user = user_service->createUser(new_user);

    ASSERT_TRUE(created_user.id.has_value());
    ASSERT_EQ(*created_user.id, 1);
    ASSERT_EQ(created_user.username, "testuser");
    ASSERT_EQ(created_user.email, "test@example.com");
    ASSERT_EQ(created_user.role, TaskManager::Models::UserRole::USER);
    ASSERT_NE(created_user.password_hash, "plain_password"); // Should be hashed
}

TEST_F(UserServiceTest, CreateUserConflict) {
    TaskManager::Models::User new_user;
    new_user.username = "existing_user";
    new_user.password_hash = "password";

    // Mock getUserByUsername to return an existing user (conflict)
    TaskManager::Database::Row existing_row;
    existing_row["id"] = "1";
    existing_row["username"] = "existing_user";
    existing_row["password_hash"] = "hashed";
    existing_row["role"] = "user";
    TaskManager::Database::ResultSet existing_results = {existing_row};

    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username"),
        ::testing::An<const std::vector<std::string>&>()
    )).WillOnce(::testing::Return(existing_results));

    ASSERT_THROW(user_service->createUser(new_user), TaskManager::Exceptions::ConflictException);
}

TEST_F(UserServiceTest, GetUserByIdSuccess) {
    long long user_id = 1;
    TaskManager::Database::Row user_row;
    user_row["id"] = std::to_string(user_id);
    user_row["username"] = "testuser";
    user_row["password_hash"] = TaskManager::Utils::StringUtil::hashPassword("password");
    user_row["email"] = "test@example.com";
    user_row["role"] = "user";
    user_row["created_at"] = "2023-01-01 00:00:00";
    user_row["updated_at"] = "2023-01-01 00:00:00";

    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{user_row}));

    std::optional<TaskManager::Models::User> user = user_service->getUserById(user_id);
    ASSERT_TRUE(user.has_value());
    ASSERT_EQ(*user->id, user_id);
    ASSERT_EQ(user->username, "testuser");

    // Verify cache hit on second call
    EXPECT_CALL(mock_db, preparedQuery(::testing::_, ::testing::_)
    ).Times(0); // Should not hit DB again
    user = user_service->getUserById(user_id);
    ASSERT_TRUE(user.has_value());
}

TEST_F(UserServiceTest, GetUserByIdNotFound) {
    long long user_id = 99;
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{}));

    std::optional<TaskManager::Models::User> user = user_service->getUserById(user_id);
    ASSERT_FALSE(user.has_value());
}

TEST_F(UserServiceTest, UpdateUserSuccess) {
    long long user_id = 1;
    TaskManager::Models::User existing_user;
    existing_user.id = user_id;
    existing_user.username = "old_user";
    existing_user.password_hash = "hashed_old_password";
    existing_user.email = "old@example.com";
    existing_user.role = TaskManager::Models::UserRole::USER;

    TaskManager::Database::Row existing_row;
    existing_row["id"] = std::to_string(user_id);
    existing_row["username"] = "old_user";
    existing_row["password_hash"] = "hashed_old_password";
    existing_row["email"] = "old@example.com";
    existing_row["role"] = "user";
    existing_row["created_at"] = "2023-01-01 00:00:00";
    existing_row["updated_at"] = "2023-01-01 00:00:00";

    // Mock initial getUserById
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{existing_row}));

    // Mock getUserByUsername for conflict check (no conflict)
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username"),
        ::testing::ElementsAre("new_user")
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{}));

    // Mock preparedExecute for update
    EXPECT_CALL(mock_db, preparedExecute(
        ::testing::StartsWith("UPDATE users SET"),
        ::testing::SizeIs(5)
    )).WillOnce(::testing::Return());

    // Mock final getUserById to retrieve updated user
    TaskManager::Database::Row updated_row = existing_row;
    updated_row["username"] = "new_user";
    updated_row["email"] = "new@example.com";
    updated_row["updated_at"] = "2023-01-02 00:00:00"; // Simulate update
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{updated_row}));


    TaskManager::Models::User updates;
    updates.username = "new_user";
    updates.email = "new@example.com";
    updates.role = TaskManager::Models::UserRole::ADMIN; // Example: admin changes role

    TaskManager::Models::User updated_user = user_service->updateUser(user_id, updates);

    ASSERT_EQ(updated_user.username, "new_user");
    ASSERT_EQ(updated_user.email, "new@example.com");
    ASSERT_EQ(updated_user.role, TaskManager::Models::UserRole::ADMIN);
}

TEST_F(UserServiceTest, DeleteUserSuccess) {
    long long user_id = 1;
    TaskManager::Database::Row existing_row;
    existing_row["id"] = std::to_string(user_id);
    existing_row["username"] = "user_to_delete";
    existing_row["password_hash"] = "hashed";
    existing_row["role"] = "user";

    // Mock getUserById
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{existing_row}));

    // Mock preparedExecute for deletion
    EXPECT_CALL(mock_db, preparedExecute(
        ::testing::StartsWith("DELETE FROM users"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return());

    ASSERT_NO_THROW(user_service->deleteUser(user_id));
}

TEST_F(UserServiceTest, VerifyUserPassword) {
    std::string username = "verify_user";
    std::string plain_password = "correct_password";
    std::string hashed_password = TaskManager::Utils::StringUtil::hashPassword(plain_password);

    TaskManager::Database::Row user_row;
    user_row["id"] = "1";
    user_row["username"] = username;
    user_row["password_hash"] = hashed_password;
    user_row["role"] = "user";

    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(username)
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{user_row}));

    ASSERT_TRUE(user_service->verifyUserPassword(username, plain_password));
    ASSERT_FALSE(user_service->verifyUserPassword(username, "wrong_password"));
}

TEST_F(UserServiceTest, ChangeUserPassword) {
    long long user_id = 1;
    std::string new_password = "new_secure_password";
    
    TaskManager::Database::Row existing_row;
    existing_row["id"] = std::to_string(user_id);
    existing_row["username"] = "user_to_change";
    existing_row["password_hash"] = "old_hashed_password";
    existing_row["role"] = "user";

    // Mock getUserById
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{existing_row}));

    // Mock preparedExecute for password update
    EXPECT_CALL(mock_db, preparedExecute(
        ::testing::StartsWith("UPDATE users SET password_hash"),
        ::testing::SizeIs(3)
    )).WillOnce(::testing::Return());

    ASSERT_NO_THROW(user_service->changeUserPassword(user_id, new_password));
}

TEST_F(UserServiceTest, IsAdmin) {
    long long admin_id = 1;
    long long regular_user_id = 2;

    TaskManager::Database::Row admin_row;
    admin_row["id"] = std::to_string(admin_id);
    admin_row["username"] = "admin";
    admin_row["password_hash"] = "hashed";
    admin_row["role"] = "admin";

    TaskManager::Database::Row user_row;
    user_row["id"] = std::to_string(regular_user_id);
    user_row["username"] = "user";
    user_row["password_hash"] = "hashed";
    user_row["role"] = "user";

    // Mock calls for admin
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(admin_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{admin_row}));

    // Mock calls for regular user
    EXPECT_CALL(mock_db, preparedQuery(
        ::testing::StartsWith("SELECT id, username, password_hash"),
        ::testing::ElementsAre(std::to_string(regular_user_id))
    )).WillOnce(::testing::Return(TaskManager::Database::ResultSet{user_row}));

    ASSERT_TRUE(user_service->isAdmin(admin_id));
    ASSERT_FALSE(user_service->isAdmin(regular_user_id));
}

TEST_F(UserServiceTest, IsOwner) {
    long long user_id = 1;
    long long resource_owner_id = 1;
    long long other_user_id = 2;

    ASSERT_TRUE(user_service->isOwner(user_id, resource_owner_id));
    ASSERT_FALSE(user_service->isOwner(user_id, other_user_id));
}
```