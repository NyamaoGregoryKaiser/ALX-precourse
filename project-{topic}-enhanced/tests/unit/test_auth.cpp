```cpp
#include "gtest/gtest.h"
#include "../../src/auth/AuthService.hpp"
#include "../../src/auth/JwtManager.hpp"
#include "../../src/database/Database.hpp"
#include "../../src/models/User.hpp"
#include "../../src/logger/Logger.hpp"
#include "../../src/utils/CryptoUtils.hpp"

#include <memory>
#include <stdexcept>
#include <chrono>
#include <thread>

// Global setup for tests
class AuthServiceTest : public ::testing::Test {
protected:
    std::unique_ptr<Database> db;
    std::unique_ptr<JwtManager> jwtManager;
    std::unique_ptr<AuthService> authService;

    const std::string TEST_DB_PATH = "./test_auth.db";
    const std::string TEST_JWT_SECRET = "test_jwt_secret_key_for_testing_purposes_only_12345";
    const int TEST_JWT_EXPIRATION = 1; // 1 second for quick expiration testing

    void SetUp() override {
        // Setup logger for tests (to avoid uninitialized logger warnings)
        Logger::setup("./test_auth.log", spdlog::level::debug, false);

        // Delete old test DB file if it exists
        remove(TEST_DB_PATH.c_str());

        db = std::make_unique<Database>(TEST_DB_PATH);
        db->connect();
        
        // Create users table for testing
        db->execute("CREATE TABLE IF NOT EXISTS users ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "username TEXT NOT NULL UNIQUE,"
                    "password_hash TEXT NOT NULL,"
                    "email TEXT NOT NULL UNIQUE,"
                    "role TEXT NOT NULL DEFAULT 'user',"
                    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP,"
                    "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                    ");");

        jwtManager = std::make_unique<JwtManager>(TEST_JWT_SECRET, TEST_JWT_EXPIRATION);
        authService = std::make_unique<AuthService>(*db, *jwtManager);
    }

    void TearDown() override {
        if (db) {
            db->disconnect();
            db.reset();
        }
        remove(TEST_DB_PATH.c_str());
        remove("./test_auth.log");
    }
};

// Test user registration with valid data
TEST_F(AuthServiceTest, RegisterUserSuccess) {
    User user = authService->registerUser("testuser", "password123", "test@example.com");
    ASSERT_GT(user.getId(), 0);
    ASSERT_EQ(user.getUsername(), "testuser");
    ASSERT_TRUE(CryptoUtils::verifyPassword("password123", user.getPasswordHash()));

    // Verify user exists in DB
    std::optional<User> fetchedUser = User::findByUsername(*db, "testuser");
    ASSERT_TRUE(fetchedUser.has_value());
    ASSERT_EQ(fetchedUser->getUsername(), "testuser");
}

// Test registration with existing username
TEST_F(AuthServiceTest, RegisterUserExistingUsername) {
    authService->registerUser("testuser", "password123", "test@example.com");
    ASSERT_THROW(authService->registerUser("testuser", "anotherpass", "another@example.com"), std::runtime_error);
}

// Test registration with existing email
TEST_F(AuthServiceTest, RegisterUserExistingEmail) {
    authService->registerUser("testuser", "password123", "test@example.com");
    ASSERT_THROW(authService->registerUser("anotheruser", "anotherpass", "test@example.com"), std::runtime_error);
}

// Test registration with empty credentials
TEST_F(AuthServiceTest, RegisterUserEmptyCredentials) {
    ASSERT_THROW(authService->registerUser("", "password123", "test@example.com"), std::runtime_error);
    ASSERT_THROW(authService->registerUser("testuser", "", "test@example.com"), std::runtime_error);
    ASSERT_THROW(authService->registerUser("testuser", "password123", ""), std::runtime_error);
}

// Test registration with weak password
TEST_F(AuthServiceTest, RegisterUserWeakPassword) {
    ASSERT_THROW(authService->registerUser("testuser", "short", "test@example.com"), std::runtime_error);
}

// Test user login with correct credentials
TEST_F(AuthServiceTest, LoginUserSuccess) {
    User registeredUser = authService->registerUser("loginuser", "loginpass", "login@example.com");
    
    int userId;
    std::string userRole;
    std::string token = authService->loginUser("loginuser", "loginpass", userId, userRole);
    
    ASSERT_FALSE(token.empty());
    ASSERT_EQ(userId, registeredUser.getId());
    ASSERT_EQ(userRole, "user");

    // Verify token validity
    int extractedUserId;
    std::string extractedUserRole;
    ASSERT_TRUE(jwtManager->verifyToken(token, extractedUserId, extractedUserRole));
    ASSERT_EQ(extractedUserId, registeredUser.getId());
    ASSERT_EQ(extractedUserRole, "user");
}

// Test user login with incorrect password
TEST_F(AuthServiceTest, LoginUserIncorrectPassword) {
    authService->registerUser("loginuser2", "loginpass2", "login2@example.com");
    int userId;
    std::string userRole;
    ASSERT_THROW(authService->loginUser("loginuser2", "wrongpass", userId, userRole), std::runtime_error);
}

// Test user login with non-existent username
TEST_F(AuthServiceTest, LoginUserNotFound) {
    int userId;
    std::string userRole;
    ASSERT_THROW(authService->loginUser("nonexistent", "somepass", userId, userRole), std::runtime_error);
}

// Test JWT token expiration
TEST_F(AuthServiceTest, JwtTokenExpiration) {
    User registeredUser = authService->registerUser("expiringuser", "exppass", "exp@example.com");
    int userId;
    std::string userRole;
    std::string token = authService->loginUser("expiringuser", "exppass", userId, userRole);

    ASSERT_FALSE(token.empty());

    // Wait for token to expire (TEST_JWT_EXPIRATION is 1 second)
    std::this_thread::sleep_for(std::chrono::seconds(TEST_JWT_EXPIRATION + 1));

    int extractedUserId;
    std::string extractedUserRole;
    ASSERT_FALSE(jwtManager->verifyToken(token, extractedUserId, extractedUserRole));
}

// Test JWT token with invalid signature (tampered token)
TEST_F(AuthServiceTest, JwtTokenInvalidSignature) {
    authService->registerUser("tamperuser", "tamperpass", "tamper@example.com");
    int userId;
    std::string userRole;
    std::string validToken = authService->loginUser("tamperuser", "tamperpass", userId, userRole);

    // Tamper with the signature (e.g., change one character)
    std::string tamperedToken = validToken;
    size_t lastDot = tamperedToken.rfind('.');
    if (lastDot != std::string::npos && lastDot + 1 < tamperedToken.length()) {
        tamperedToken[lastDot + 1] = (tamperedToken[lastDot + 1] == 'A' ? 'B' : 'A');
    } else {
        FAIL() << "Could not tamper with token signature.";
    }

    int extractedUserId;
    std::string extractedUserRole;
    ASSERT_FALSE(jwtManager->verifyToken(tamperedToken, extractedUserId, extractedUserRole));
}

// Test JWT token with malformed structure
TEST_F(AuthServiceTest, JwtTokenMalformed) {
    std::string malformedToken = "invalid.token.format";
    int extractedUserId;
    std::string extractedUserRole;
    ASSERT_FALSE(jwtManager->verifyToken(malformedToken, extractedUserId, extractedUserRole));

    std::string partialToken = "invalidheader.invalidpayload";
    ASSERT_FALSE(jwtManager->verifyToken(partialToken, extractedUserId, extractedUserRole));
}
```