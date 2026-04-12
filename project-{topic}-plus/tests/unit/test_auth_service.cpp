#include <gtest/gtest.h>
#include "src/auth/auth_service.h"
#include "src/models/user.h"
#include "src/database/database_manager.h"
#include "src/config/config.h"
#include "src/utils/exceptions.h"
#include "src/utils/logger.h"
#include <fstream>

// Fixture for AuthService tests
class AuthServiceTest : public ::testing::Test {
protected:
    AuthService auth_service;
    DatabaseManager& db_manager = DatabaseManager::getInstance();
    std::string test_db_path = "./data/test_auth.db"; // Unique DB for this test suite

    void SetUp() override {
        // Initialize logger for tests
        Logger::Logger::getInstance().init("./logs/test_auth_service.log", Logger::Level::WARN);

        // Ensure JWT_SECRET is set for tests
        // This is a workaround for tests, in prod it should be in .env or system env.
        #ifdef _WIN32
            _putenv_s("JWT_SECRET", "test_jwt_secret");
            _putenv_s("JWT_EXPIRATION_SECONDS", "10");
        #else
            setenv("JWT_SECRET", "test_jwt_secret", 1);
            setenv("JWT_EXPIRATION_SECONDS", "10", 1);
        #endif

        // Clean up previous test database if it exists
        std::remove(test_db_path.c_str());
        
        db_manager.init(test_db_path);
        // Create schema
        db_manager.execute("CREATE TABLE IF NOT EXISTS users ("
                           "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                           "username TEXT NOT NULL UNIQUE,"
                           "password_hash TEXT NOT NULL,"
                           "role TEXT NOT NULL DEFAULT 'user',"
                           "created_at TEXT NOT NULL,"
                           "updated_at TEXT NOT NULL"
                           ");");
    }

    void TearDown() override {
        db_manager.close();
        // Remove the test database file
        std::remove(test_db_path.c_str());
    }
};

TEST_F(AuthServiceTest, RegisterUserSuccess) {
    ASSERT_NO_THROW({
        std::optional<User> user = auth_service.register_user("testuser", "password123", UserRole::USER);
        ASSERT_TRUE(user);
        ASSERT_EQ(user->username, "testuser");
        ASSERT_EQ(user->role, UserRole::USER);
        ASSERT_NE(user->password_hash, "password123"); // Should be hashed
    });
}

TEST_F(AuthServiceTest, RegisterUserDuplicateUsername) {
    auth_service.register_user("duplicateuser", "password123");
    ASSERT_THROW({
        auth_service.register_user("duplicateuser", "anotherpass");
    }, ConflictException);
}

TEST_F(AuthServiceTest, RegisterUserEmptyCredentials) {
    ASSERT_THROW({
        auth_service.register_user("", "password");
    }, BadRequestException);
    ASSERT_THROW({
        auth_service.register_user("user", "");
    }, BadRequestException);
}

TEST_F(AuthServiceTest, RegisterUserShortPassword) {
    ASSERT_THROW({
        auth_service.register_user("shortpassuser", "short"); // Assuming min length 6
    }, BadRequestException);
}

TEST_F(AuthServiceTest, LoginUserSuccess) {
    auth_service.register_user("loginuser", "loginpass", UserRole::USER);
    std::optional<std::string> token = auth_service.login_user("loginuser", "loginpass");
    ASSERT_TRUE(token);
    ASSERT_FALSE(token->empty());

    // Verify the token
    std::optional<JwtPayload> payload = auth_service.verify_token(*token);
    ASSERT_TRUE(payload);
    ASSERT_EQ(payload->username, "loginuser");
    ASSERT_EQ(payload->role, UserRole::USER);
}

TEST_F(AuthServiceTest, LoginUserInvalidCredentials) {
    auth_service.register_user("badloginuser", "correctpass");
    ASSERT_THROW({
        auth_service.login_user("badloginuser", "wrongpass");
    }, UnauthorizedException);
    ASSERT_THROW({
        auth_service.login_user("nonexistent", "somepass");
    }, UnauthorizedException);
}

TEST_F(AuthServiceTest, VerifyTokenInvalid) {
    std::string invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKx"; // Invalid signature
    std::optional<JwtPayload> payload = auth_service.verify_token(invalid_token);
    ASSERT_FALSE(payload);
}

TEST_F(AuthServiceTest, VerifyTokenExpired) {
    // Temporarily set a very short expiration
    #ifdef _WIN32
        _putenv_s("JWT_EXPIRATION_SECONDS", "1");
    #else
        setenv("JWT_EXPIRATION_SECONDS", "1", 1);
    #endif
    
    auth_service.register_user("expireuser", "expirepass");
    std::optional<std::string> token = auth_service.login_user("expireuser", "expirepass");
    ASSERT_TRUE(token);

    // Wait for token to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    std::optional<JwtPayload> payload = auth_service.verify_token(*token);
    ASSERT_FALSE(payload);

    // Reset expiration for other tests
    #ifdef _WIN32
        _putenv_s("JWT_EXPIRATION_SECONDS", "10");
    #else
        setenv("JWT_EXPIRATION_SECONDS", "10", 1);
    #endif
}

TEST_F(AuthServiceTest, PasswordHashingAndVerification) {
    std::string password = "mySecurePassword123";
    std::string hashed_password = auth_service.hash_password(password);
    
    ASSERT_NE(password, hashed_password); // Hash should not be plain text
    ASSERT_TRUE(auth_service.verify_password(password, hashed_password));
    ASSERT_FALSE(auth_service.verify_password("wrongpassword", hashed_password));
}
```