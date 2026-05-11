#include "gtest/gtest.h"
#include "../../src/services/AuthService.h"
#include "../../src/models/User.h"
#include "../../src/db/repositories/UserRepository.h"
#include "../../src/db/DbConnection.h"
#include "../../src/utils/Config.h"
#include "../../src/utils/Logger.h"

// Mock UserRepository for unit testing AuthService in isolation
class MockUserRepository : public UserRepository {
public:
    MockUserRepository(std::function<std::shared_ptr<PooledConnection>()> get_conn_func)
        : UserRepository(get_conn_func) {}

    MOCK_METHOD(std::optional<User>, findByUsername, (const std::string& username), (override));
    // Add other mocks as needed
};

// Test fixture for AuthService
class AuthServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup a mock JWT secret for testing
        Config::set("JWT_SECRET", "test_secret_for_unit_tests_123456789012345678901234567890");
        authService = std::make_unique<AuthService>(Config::get("JWT_SECRET"));
        // Logger::init(); // Initialize logger once if not already
    }

    std::unique_ptr<AuthService> authService;
};

TEST_F(AuthServiceTest, HashPasswordReturnsConsistentHash) {
    std::string password = "mySecurePassword123";
    std::string hash1 = AuthService::hashPassword(password);
    std::string hash2 = AuthService::hashPassword(password);
    ASSERT_EQ(hash1, hash2);
    ASSERT_FALSE(hash1.empty());
    ASSERT_NE(password, hash1); // Ensure it's actually hashed
}

TEST_F(AuthServiceTest, VerifyPasswordCorrectlyValidates) {
    std::string password = "anotherSecurePassword!";
    std::string hashedPassword = AuthService::hashPassword(password);
    ASSERT_TRUE(AuthService::verifyPassword(password, hashedPassword));
    ASSERT_FALSE(AuthService::verifyPassword("wrongpassword", hashedPassword));
}

TEST_F(AuthServiceTest, LoginSucceedsWithCorrectCredentials) {
    // This test requires a mocked UserRepository.
    // For simplicity, we'll use a direct mock within the test.
    // In a real scenario, use Google Mock for more robust mocking.

    User testUser = {1, "testuser", AuthService::hashPassword("password123"), "test@example.com", "USER"};

    // Mock the findByUsername behavior
    // This is a simple lambda mock, for complex mocks, use Google Mock
    auto mock_find_by_username = [&](const std::string& username) -> std::optional<User> {
        if (username == testUser.username) {
            return testUser;
        }
        return std::nullopt;
    };

    // Need a function for DbConnection::getPool().getConnection()
    // For unit tests, DbConnection should ideally be mocked or bypassed.
    // Here, we provide a dummy one assuming it's not actually used for `findByUsername` in the mock.
    auto dummy_get_conn_func = []() { return std::make_shared<PooledConnection>("dummy_conn_str"); };
    UserRepository mockRepo(dummy_get_conn_func);
    // Overriding the findByUsername behavior directly for this test
    // This is not typical for `UserRepository`, a MOCK class would be better.
    // Let's just create a test scenario that doesn't need a deep mock.
    // For a unit test, AuthService should *not* hit the real DB or repo directly.

    // A more proper way using a mock object (requires Google Mock and proper virtual methods)
    // MockUserRepository mockRepo(dummy_get_conn_func);
    // EXPECT_CALL(mockRepo, findByUsername("testuser"))
    //     .WillOnce(::testing::Return(testUser));
    // EXPECT_CALL(mockRepo, findByUsername("nonexistent"))
    //     .WillOnce(::testing::Return(std::nullopt));

    // Due to the difficulty of mocking a concrete class without virtual functions,
    // let's adjust this test to focus solely on the hashing and JWT generation
    // and assume `UserRepository` integration is covered in integration tests.
    // For `AuthService::login`, we need `UserRepository` to return a user.
    // Without Google Mock for a concrete class, this part is tricky.
    // Let's create a minimal testable UserRepository with a fixed user:
    class TestUserRepository : public UserRepository {
    public:
        TestUserRepository(std::function<std::shared_ptr<PooledConnection>()> get_conn_func, const User& user_to_return)
            : UserRepository(get_conn_func), user_for_test(user_to_return) {}
        std::optional<User> findByUsername(const std::string& username) override {
            if (username == user_for_test.username) return user_for_test;
            return std::nullopt;
        }
        User user_for_test;
    };
    TestUserRepository testRepo(dummy_get_conn_func, testUser);

    std::optional<std::string> token = authService->login("testuser", "password123", testRepo);
    ASSERT_TRUE(token.has_value());
    ASSERT_FALSE(token->empty());

    // Verify a portion of the token (as it's a mock token)
    ASSERT_TRUE(token->find("mock_jwt_token_for_testuser") != std::string::npos);
}

TEST_F(AuthServiceTest, LoginFailsWithIncorrectCredentials) {
    User testUser = {2, "otheruser", AuthService::hashPassword("pass"), "other@example.com", "USER"};
    auto dummy_get_conn_func = []() { return std::make_shared<PooledConnection>("dummy_conn_str"); };
    class TestUserRepository : public UserRepository {
    public:
        TestUserRepository(std::function<std::shared_ptr<PooledConnection>()> get_conn_func, const User& user_to_return)
            : UserRepository(get_conn_func), user_for_test(user_to_return) {}
        std::optional<User> findByUsername(const std::string& username) override {
            if (username == user_for_test.username) return user_for_test;
            return std::nullopt;
        }
        User user_for_test;
    };
    TestUserRepository testRepo(dummy_get_conn_func, testUser);

    std::optional<std::string> token = authService->login("otheruser", "wrongpass", testRepo);
    ASSERT_FALSE(token.has_value());

    token = authService->login("nonexistent", "anypass", testRepo);
    ASSERT_FALSE(token.has_value());
}

TEST_F(AuthServiceTest, VerifyTokenReturnsClaimsForValidMockToken) {
    User testUser = {3, "validuser", "hash", "valid@example.com", "ADMIN"};
    std::string token = authService->generateToken(testUser); // Use the mock generator

    std::map<std::string, std::string> claims = authService->verifyToken(token);
    ASSERT_FALSE(claims.empty());
    ASSERT_EQ(claims["userId"], "3");
    ASSERT_EQ(claims["username"], "validuser");
    ASSERT_EQ(claims["role"], "ADMIN");
}

TEST_F(AuthServiceTest, VerifyTokenReturnsEmptyForInvalidToken) {
    std::string invalidToken = "not.a.real.token";
    std::map<std::string, std::string> claims = authService->verifyToken(invalidToken);
    ASSERT_TRUE(claims.empty());

    std::string malformedToken = "mock_jwt_token_for_user_1"; // Missing role
    claims = authService->verifyToken(malformedToken);
    ASSERT_TRUE(claims.empty());
}
```