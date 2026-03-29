```cpp
#include "gtest/gtest.h"
#include "../../src/utils/JWTManager.hpp"
#include "../../src/utils/Logger.hpp"
#include "../../src/exceptions/CustomExceptions.hpp"
#include <chrono>
#include <thread>

class JWTManagerTest : public ::testing::Test {
protected:
    const std::string TEST_SECRET = "super_secret_test_key";
    const int TEST_EXPIRY_MINUTES = 1; // 1 minute for testing
    std::unique_ptr<JWTManager> jwt_manager_;

    void SetUp() override {
        jwt_manager_ = std::make_unique<JWTManager>(TEST_SECRET, TEST_EXPIRY_MINUTES);
        Logger::init(LogLevel::DEBUG, "test_jwt_manager.log");
    }

    void TearDown() override {
        Logger::close();
    }
};

TEST_F(JWTManagerTest, GenerateAndVerifyTokenSuccess) {
    int user_id = 123;
    std::string username = "testuser";
    std::string role = "USER";

    std::string token = jwt_manager_->generateToken(user_id, username, role);
    ASSERT_FALSE(token.empty());

    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(token);
    ASSERT_TRUE(decoded.has_value());
    ASSERT_EQ(decoded->user_id, user_id);
    ASSERT_EQ(decoded->username, username);
    ASSERT_EQ(decoded->role, UserRole::USER);
}

TEST_F(JWTManagerTest, VerifyInvalidToken) {
    std::string invalid_token = "invalid.jwt.token";
    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(invalid_token);
    ASSERT_FALSE(decoded.has_value());
}

TEST_F(JWTManagerTest, VerifyTokenWithWrongSecret) {
    int user_id = 123;
    std::string username = "testuser";
    std::string role = "USER";

    std::string token = jwt_manager_->generateToken(user_id, username, role);

    JWTManager wrong_secret_manager("wrong_secret_key", TEST_EXPIRY_MINUTES);
    std::optional<DecodedToken> decoded = wrong_secret_manager.verifyToken(token);
    ASSERT_FALSE(decoded.has_value());
}

TEST_F(JWTManagerTest, VerifyExpiredToken) {
    int user_id = 456;
    std::string username = "expiryuser";
    std::string role = "ADMIN";

    std::string token = jwt_manager_->generateToken(user_id, username, role);
    ASSERT_FALSE(token.empty());

    // Wait for the token to expire (TEST_EXPIRY_MINUTES + a small buffer)
    std::this_thread::sleep_for(std::chrono::minutes(TEST_EXPIRY_MINUTES + 1));

    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(token);
    ASSERT_FALSE(decoded.has_value()); // Token should be expired
}

TEST_F(JWTManagerTest, GenerateAndVerifyAdminRole) {
    int user_id = 789;
    std::string username = "adminuser";
    std::string role = "ADMIN";

    std::string token = jwt_manager_->generateToken(user_id, username, role);
    std::optional<DecodedToken> decoded = jwt_manager_->verifyToken(token);

    ASSERT_TRUE(decoded.has_value());
    ASSERT_EQ(decoded->role, UserRole::ADMIN);
}
```