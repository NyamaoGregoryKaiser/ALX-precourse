```cpp
#include <gtest/gtest.h>
#include "../../src/services/AuthService.h"
#include "../../src/database/DatabaseManager.h"
#include "../../src/exceptions/CustomExceptions.h"
#include "../../src/utils/Hasher.h"
#include "../../src/utils/JwtManager.h"
#include "../../src/config/AppConfig.h" // For JWT secret setup

using namespace PaymentProcessor::Services;
using namespace PaymentProcessor::Database;
using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Exceptions;
using namespace PaymentProcessor::Utils;
using namespace PaymentProcessor::Config;

// Setup fixture for AuthService tests
class AuthServiceTest : public ::testing::Test {
protected:
    DatabaseManager& dbManager = DatabaseManager::getInstance();
    AuthService* authService; // Pointer to allow re-creation for isolation
    std::string testDbPath = "test_auth_service.db";

    void SetUp() override {
        // Initialize DB for each test to ensure isolation
        if (std::remove(testDbPath.c_str()) != 0) {
            // File might not exist, which is fine, or it's locked. Log if it fails to remove.
        }
        dbManager.init(testDbPath);
        authService = new AuthService(dbManager);

        // Ensure JWT_SECRET_KEY is set for tests
        AppConfig::getInstance().load("config/app.config.json"); // Load config
        JwtManager::SECRET_KEY = AppConfig::getInstance().getJwtSecret();
    }

    void TearDown() override {
        delete authService;
        // Clean up test DB after each test
        std::remove(testDbPath.c_str());
    }
};

TEST_F(AuthServiceTest, RegisterUserSuccess) {
    User newUser = authService->registerUser("testuser", "password123", "test@example.com", UserRole::MERCHANT);
    ASSERT_TRUE(newUser.id.has_value());
    ASSERT_EQ(newUser.username, "testuser");
    ASSERT_EQ(newUser.email, "test@example.com");
    ASSERT_EQ(newUser.role, UserRole::MERCHANT);
    ASSERT_TRUE(Hasher::verifyPassword("password123", newUser.passwordHash));

    // Verify user exists in DB
    auto foundUser = dbManager.findUserById(*newUser.id);
    ASSERT_TRUE(foundUser.has_value());
    ASSERT_EQ(foundUser->username, "testuser");
}

TEST_F(AuthServiceTest, RegisterUserDuplicateUsernameFails) {
    authService->registerUser("duplicate", "password123", "dup1@example.com", UserRole::MERCHANT);
    ASSERT_THROW(authService->registerUser("duplicate", "password456", "dup2@example.com", UserRole::MERCHANT), ValidationException);
}

TEST_F(AuthServiceTest, RegisterUserInvalidPasswordFails) {
    ASSERT_THROW(authService->registerUser("shortpass", "short", "short@example.com", UserRole::MERCHANT), ValidationException);
}

TEST_F(AuthServiceTest, LoginSuccess) {
    authService->registerUser("loginuser", "securepass", "login@example.com", UserRole::MERCHANT);
    std::string token = authService->login("loginuser", "securepass");
    ASSERT_FALSE(token.empty());
    ASSERT_TRUE(authService->validateToken(token));
}

TEST_F(AuthServiceTest, LoginInvalidCredentialsFails) {
    authService->registerUser("badlogin", "goodpass", "badlogin@example.com", UserRole::MERCHANT);
    ASSERT_THROW(authService->login("badlogin", "wrongpass"), UnauthorizedException);
    ASSERT_THROW(authService->login("nonexistent", "anypass"), UnauthorizedException);
}

TEST_F(AuthServiceTest, ValidateTokenInvalidFails) {
    std::string invalidToken = "invalid.token.signature";
    ASSERT_FALSE(authService->validateToken(invalidToken));
}

TEST_F(AuthServiceTest, GetClaimsFromToken) {
    User newUser = authService->registerUser("claimuser", "claimpass", "claim@example.com", UserRole::ADMIN);
    std::string token = authService->login("claimuser", "claimpass");

    ASSERT_EQ(authService->getUserIdFromToken(token), std::to_string(*newUser.id));
    ASSERT_EQ(authService->getUserRoleFromToken(token), "ADMIN");
}

// Add tests for AccountService, TransactionService, DatabaseManager directly, etc.
```