#include "gtest/gtest.h"
#include "gmock/gmock.h"
#include "../../src/services/user_service.h"
#include "../../src/repositories/user_repository.h"
#include "../../src/core/middleware.h" // For ApiException

using namespace testing;

// Mock UserRepository
class MockUserRepository : public UserRepository {
public:
    MockUserRepository() : UserRepository("dummy_conn_str") {} // Pass a dummy connection string

    MOCK_METHOD(std::optional<User>, create, (User& user), (override));
    MOCK_METHOD(std::optional<User>, find_by_id, (long long id), (override));
    MOCK_METHOD(std::optional<User>, find_by_email, (const std::string& email), (override));
    MOCK_METHOD(std::vector<User>, find_all, (int limit, int offset), (override));
    MOCK_METHOD(bool, update, (const User& user), (override));
    MOCK_METHOD(bool, remove, (long long id), (override));
    MOCK_METHOD(long long, count, (), (override));
};

// Test fixture for UserService
class UserServiceTest : public Test {
protected:
    MockUserRepository mock_repo;
    UserService user_service;

    UserServiceTest() : user_service(mock_repo) {
        // Suppress spdlog output during tests if needed
        spdlog::set_level(spdlog::level::off);
    }

    void SetUp() override {
        // Reset mocks before each test
        EXPECT_CALL(mock_repo, find_by_email(_, _)).Times(AnyNumber()); // Default for registration checks
    }
};

TEST_F(UserServiceTest, RegisterUser_Success) {
    UserCreateDTO create_dto = {"newuser", "new@example.com", "securepassword123"};
    User new_user_model(create_dto.username, create_dto.email, PasswordHasher::hash_password(create_dto.password));
    new_user_model.id = 1; // Simulate ID being set by repository

    EXPECT_CALL(mock_repo, find_by_email("new@example.com"))
        .WillOnce(Return(std::nullopt)); // Email not found
    EXPECT_CALL(mock_repo, create(An<User&>()))
        .WillOnce(DoAll(SetArgReferee<0>(new_user_model), Return(new_user_model))); // Repo returns user with ID

    auto result = user_service.register_user(create_dto);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->username, "newuser");
    EXPECT_EQ(result->email, "new@example.com");
    EXPECT_EQ(result->id, 1);
    EXPECT_EQ(result->role, "user");
}

TEST_F(UserServiceTest, RegisterUser_EmailAlreadyExists) {
    User existing_user("existing", "existing@example.com", "hash", UserRole::USER);
    existing_user.id = 1;

    UserCreateDTO create_dto = {"existing", "existing@example.com", "password"};

    EXPECT_CALL(mock_repo, find_by_email("existing@example.com"))
        .WillOnce(Return(existing_user)); // Email already exists

    EXPECT_THROW({
        try {
            user_service.register_user(create_dto);
        } catch (const ApiException& e) {
            EXPECT_EQ(e.status_code, Pistache::Http::Code::Conflict);
            EXPECT_EQ(e.what(), std::string("User with this email already exists"));
            throw;
        }
    }, ApiException);
}

TEST_F(UserServiceTest, RegisterUser_WeakPassword) {
    UserCreateDTO create_dto = {"newuser", "new@example.com", "short"}; // Password too short

    EXPECT_CALL(mock_repo, find_by_email("new@example.com"))
        .WillOnce(Return(std::nullopt));

    EXPECT_THROW({
        try {
            user_service.register_user(create_dto);
        } catch (const ApiException& e) {
            EXPECT_EQ(e.status_code, Pistache::Http::Code::Bad_Request);
            EXPECT_EQ(e.what(), std::string("Password must be at least 8 characters long"));
            throw;
        }
    }, ApiException);
}

TEST_F(UserServiceTest, GetUserById_Success) {
    User expected_user("test", "test@example.com", "hash", UserRole::USER);
    expected_user.id = 100;

    EXPECT_CALL(mock_repo, find_by_id(100))
        .WillOnce(Return(expected_user));

    auto result = user_service.get_user_by_id(100);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->id, 100);
    EXPECT_EQ(result->username, "test");
}

TEST_F(UserServiceTest, GetUserById_NotFound) {
    EXPECT_CALL(mock_repo, find_by_id(999))
        .WillOnce(Return(std::nullopt));

    auto result = user_service.get_user_by_id(999);

    ASSERT_FALSE(result.has_value());
}

TEST_F(UserServiceTest, UpdateUser_AdminSuccess) {
    User existing_user(1, "olduser", "old@example.com", "old_hash", UserRole::USER, 0, 0);
    User updated_user = existing_user;
    updated_user.username = "newuser";
    updated_user.role = UserRole::ADMIN; // Admin changes role

    UserUpdateDTO update_dto;
    update_dto.username = "newuser";
    update_dto.role = "admin";

    EXPECT_CALL(mock_repo, find_by_id(1))
        .WillOnce(Return(existing_user));
    EXPECT_CALL(mock_repo, update(An<const User&>()))
        .WillOnce(Return(true));

    auto result = user_service.update_user(1, update_dto, UserRole::ADMIN);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->username, "newuser");
    EXPECT_EQ(result->role, "admin");
}

TEST_F(UserServiceTest, UpdateUser_ForbiddenForNonAdmin) {
    User existing_user(1, "olduser", "old@example.com", "old_hash", UserRole::USER, 0, 0);

    UserUpdateDTO update_dto;
    update_dto.role = "admin"; // Non-admin attempts to change role

    EXPECT_CALL(mock_repo, find_by_id(1))
        .WillOnce(Return(existing_user));

    EXPECT_THROW({
        try {
            user_service.update_user(1, update_dto, UserRole::USER);
        } catch (const ApiException& e) {
            EXPECT_EQ(e.status_code, Pistache::Http::Code::Forbidden);
            throw;
        }
    }, ApiException);
}

TEST_F(UserServiceTest, DeleteUser_AdminSuccess) {
    User existing_user(1, "tobedeleted", "delete@example.com", "hash", UserRole::USER, 0, 0);

    EXPECT_CALL(mock_repo, find_by_id(1))
        .WillOnce(Return(existing_user));
    EXPECT_CALL(mock_repo, remove(1))
        .WillOnce(Return(true));

    bool result = user_service.delete_user(1, UserRole::ADMIN);
    EXPECT_TRUE(result);
}

TEST_F(UserServiceTest, DeleteUser_ForbiddenForNonAdmin) {
    User existing_user(1, "tobedeleted", "delete@example.com", "hash", UserRole::USER, 0, 0);

    EXPECT_CALL(mock_repo, find_by_id(1))
        .WillOnce(Return(existing_user));

    EXPECT_THROW({
        try {
            user_service.delete_user(1, UserRole::USER);
        } catch (const ApiException& e) {
            EXPECT_EQ(e.status_code, Pistache::Http::Code::Forbidden);
            throw;
        }
    }, ApiException);
}

TEST_F(UserServiceTest, ValidateCredentials_Success) {
    std::string password = "testpassword";
    std::string hashed_password = PasswordHasher::hash_password(password); // Use actual hasher

    User valid_user("valid", "valid@example.com", hashed_password, UserRole::USER);
    valid_user.id = 1;

    EXPECT_CALL(mock_repo, find_by_email("valid@example.com"))
        .WillOnce(Return(valid_user));

    auto result = user_service.validate_credentials("valid@example.com", password);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->email, "valid@example.com");
}

TEST_F(UserServiceTest, ValidateCredentials_InvalidPassword) {
    std::string correct_password = "testpassword";
    std::string hashed_password = PasswordHasher::hash_password(correct_password);

    User valid_user("valid", "valid@example.com", hashed_password, UserRole::USER);
    valid_user.id = 1;

    EXPECT_CALL(mock_repo, find_by_email("valid@example.com"))
        .WillOnce(Return(valid_user));

    auto result = user_service.validate_credentials("valid@example.com", "wrongpassword");
    ASSERT_FALSE(result.has_value());
}

TEST_F(UserServiceTest, ValidateCredentials_UserNotFound) {
    EXPECT_CALL(mock_repo, find_by_email("nonexistent@example.com"))
        .WillOnce(Return(std::nullopt));

    auto result = user_service.validate_credentials("nonexistent@example.com", "anypassword");
    ASSERT_FALSE(result.has_value());
}