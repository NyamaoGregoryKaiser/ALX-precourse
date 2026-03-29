```cpp
#include "gtest/gtest.h"
#include "../../src/services/AuthService.hpp"
#include "../../src/database/SQLiteDatabaseManager.hpp"
#include "../../src/utils/JWTManager.hpp"
#include "../../src/utils/PasswordUtils.hpp"
#include "../../src/config/AppConfig.hpp"
#include <memory>
#include <chrono>
#include <thread>
#include <filesystem>

namespace fs = std::filesystem;

class AuthServiceTest : public ::testing::Test {
protected:
    std::shared_ptr<SQLiteDatabaseManager> db_manager_;
    std::unique_ptr<JWTManager> jwt_manager_;
    std::unique_ptr<AuthService> auth_service_;
    const std::string TEST_DB_PATH = "test_auth.db";
    const std::string JWT_TEST_SECRET = "test_secret_for_auth_service";
    const int JWT_TEST_EXPIRY = 1; // 1 minute expiry

    void SetUp() override {
        // Ensure test environment is clean
        if (fs::exists(TEST_DB_PATH)) {
            fs::remove(TEST_DB_PATH);
        }

        // Initialize AppConfig (required by JWTManager and others)
        AppConfig::loadConfig(".env"); // Assuming .env has been copied by CI/CD script
        AppConfig::config_map["JWT_SECRET"] = JWT_TEST_SECRET;
        AppConfig::config_map["JWT_EXPIRY_MINUTES"] = std::to_string(JWT_TEST_EXPIRY);


        db_manager_ = std::make_shared<SQLiteDatabaseManager>(TEST_DB_PATH);
        db_manager_->initializeSchema(); // Create tables
        
        jwt_manager_ = std::make_unique<JWTManager>(JWT_TEST_SECRET, JWT_TEST_EXPIRY);
        auth_service_ = std::make_unique<AuthService>(db_manager_, *jwt_manager_);

        Logger::init(LogLevel::DEBUG, "test_auth_service.log");
    }

    void TearDown() override {
        db_manager_->close();
        if (fs::exists(TEST_DB_PATH)) {
            fs::remove(TEST_DB_PATH);
        }
        Logger::close();
    }
};

TEST_F(AuthServiceTest, RegisterUserSuccess) {
    UserRegisterDTO register_dto;
    register_dto.username = "testuser";
    register_dto.email = "test@example.com";
    register_dto.password = "password123";

    AuthResponseDTO response = auth_service_->registerUser(register_dto);

    ASSERT_FALSE(response.token.empty());
    ASSERT_TRUE(response.user.id.has_value());
    ASSERT_EQ(response.user.username, "testuser");
    ASSERT_EQ(response.user.email, "test@example.com");
    ASSERT_EQ(response.user.role, UserRole::USER);

    std::optional<User> retrieved_user = db_manager_->getUserByUsername("testuser");
    ASSERT_TRUE(retrieved_user.has_value());
    ASSERT_EQ(retrieved_user->email, "test@example.com");
    ASSERT_TRUE(PWDUtils::verifyPassword("password123", retrieved_user->password_hash));
}

TEST_F(AuthServiceTest, RegisterUserDuplicateUsername) {
    UserRegisterDTO register_dto_1;
    register_dto_1.username = "testuser";
    register_dto_1.email = "test1@example.com";
    register_dto_1.password = "password123";
    auth_service_->registerUser(register_dto_1);

    UserRegisterDTO register_dto_2;
    register_dto_2.username = "testuser"; // Duplicate
    register_dto_2.email = "test2@example.com";
    register_dto_2.password = "password456";

    ASSERT_THROW(auth_service_->registerUser(register_dto_2), ConflictException);
}

TEST_F(AuthServiceTest, RegisterUserDuplicateEmail) {
    UserRegisterDTO register_dto_1;
    register_dto_1.username = "testuser1";
    register_dto_1.email = "test@example.com";
    register_dto_1.password = "password123";
    auth_service_->registerUser(register_dto_1);

    UserRegisterDTO register_dto_2;
    register_dto_2.username = "testuser2";
    register_dto_2.email = "test@example.com"; // Duplicate
    register_dto_2.password = "password456";

    ASSERT_THROW(auth_service_->registerUser(register_dto_2), ConflictException);
}

TEST_F(AuthServiceTest, LoginUserSuccess) {
    UserRegisterDTO register_dto;
    register_dto.username = "loginuser";
    register_dto.email = "login@example.com";
    register_dto.password = "securepass";
    auth_service_->registerUser(register_dto);

    UserLoginDTO login_dto;
    login_dto.username = "loginuser";
    login_dto.password = "securepass";

    AuthResponseDTO response = auth_service_->loginUser(login_dto);

    ASSERT_FALSE(response.token.empty());
    ASSERT_TRUE(response.user.id.has_value());
    ASSERT_EQ(response.user.username, "loginuser");

    // Verify token validity
    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(response.token);
    ASSERT_TRUE(decoded.has_value());
    ASSERT_EQ(decoded->username, "loginuser");
    ASSERT_EQ(decoded->user_id, response.user.id.value());
}

TEST_F(AuthServiceTest, LoginUserInvalidUsername) {
    UserLoginDTO login_dto;
    login_dto.username = "nonexistent";
    login_dto.password = "anypass";

    ASSERT_THROW(auth_service_->loginUser(login_dto), UnauthorizedException);
}

TEST_F(AuthServiceTest, LoginUserInvalidPassword) {
    UserRegisterDTO register_dto;
    register_dto.username = "wrongpassuser";
    register_dto.email = "wrong@example.com";
    register_dto.password = "correctpass";
    auth_service_->registerUser(register_dto);

    UserLoginDTO login_dto;
    login_dto.username = "wrongpassuser";
    login_dto.password = "incorrectpass";

    ASSERT_THROW(auth_service_->loginUser(login_dto), UnauthorizedException);
}

TEST_F(AuthServiceTest, LoginUserTokenExpiry) {
    UserRegisterDTO register_dto;
    register_dto.username = "expiryuser";
    register_dto.email = "expiry@example.com";
    register_dto.password = "expirytest";
    auth_service_->registerUser(register_dto);

    UserLoginDTO login_dto;
    login_dto.username = "expiryuser";
    login_dto.password = "expirytest";

    AuthResponseDTO response = auth_service_->loginUser(login_dto);
    ASSERT_FALSE(response.token.empty());

    // Wait for JWT_TEST_EXPIRY minutes + a buffer
    std::this_thread::sleep_for(std::chrono::minutes(JWT_TEST_EXPIRY + 1));

    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(response.token);
    ASSERT_FALSE(decoded.has_value()); // Should be expired
}

```