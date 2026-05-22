```cpp
#include "gtest/gtest.h"
#include "utils/JwtManager.h"
#include "utils/Logger.h" // For test logging
#include "config/Config.h" // For JWT_SECRET
#include <chrono>
#include <thread>

// Mock Config for JWT_SECRET
namespace Config {
    std::map<std::string, std::string> mock_config;
    void load(const std::string&) {
        mock_config["JWT_SECRET"] = "test_jwt_secret_12345";
        mock_config["JWT_EXPIRATION_SECONDS"] = "1"; // 1 second for expiry tests
    }
    template <typename T>
    T get(const std::string& key, const T& defaultValue) {
        if (mock_config.count(key)) {
            if constexpr (std::is_same_v<T, std::string>) return mock_config[key];
            if constexpr (std::is_same_v<T, int>) return std::stoi(mock_config[key]);
        }
        return defaultValue;
    }
    template <typename T>
    T get(const std::string& key) {
        if (mock_config.count(key)) {
            if constexpr (std::is_same_v<T, std::string>) return mock_config[key];
            if constexpr (std::is_same_v<T, int>) return std::stoi(mock_config[key]);
        }
        throw std::runtime_error("Config key not found in mock: " + key);
    }
    bool isLoaded() { return true; }
    void clear() { mock_config.clear(); }
}

class JwtManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        Logger::init();
        Config::load(""); // Load mock config
        JwtManager::init(Config::get<std::string>("JWT_SECRET"), Config::get<int>("JWT_EXPIRATION_SECONDS"));
    }

    void TearDown() override {
        Config::clear();
    }
};

TEST_F(JwtManagerTest, GenerateAndVerifyTokenSuccessfully) {
    int user_id = 123;
    std::string username = "testuser";
    std::string token = JwtManager::generateToken(user_id, username);

    ASSERT_FALSE(token.empty());

    // Verify token
    try {
        jwt::decode decoded_token = JwtManager::verifyToken(token);
        ASSERT_EQ(decoded_token.get_payload_claim("user_id").as_int(), user_id);
        ASSERT_EQ(decoded_token.get_payload_claim("username").as_string(), username);
    } catch (const jwt::error::signature_verification_exception& e) {
        FAIL() << "Signature verification failed: " << e.what();
    } catch (const jwt::error::token_verification_exception& e) {
        FAIL() << "Token verification failed: " << e.what();
    } catch (const std::exception& e) {
        FAIL() << "Unexpected error during token verification: " << e.what();
    }
}

TEST_F(JwtManagerTest, VerifyInvalidToken) {
    std::string invalid_token = "invalid.token.string";
    ASSERT_THROW(JwtManager::verifyToken(invalid_token), jwt::error::token_verification_exception);
}

TEST_F(JwtManagerTest, VerifyTokenWithWrongSecret) {
    int user_id = 456;
    std::string username = "anotheruser";
    std::string token = JwtManager::generateToken(user_id, username); // Generated with "test_jwt_secret_12345"

    // Re-initialize JwtManager with a different secret
    JwtManager::init("wrong_secret", 1);

    ASSERT_THROW(JwtManager::verifyToken(token), jwt::error::signature_verification_exception);

    // Re-initialize with correct secret for other tests
    JwtManager::init(Config::get<std::string>("JWT_SECRET"), Config::get<int>("JWT_EXPIRATION_SECONDS"));
}

TEST_F(JwtManagerTest, TokenExpiration) {
    int user_id = 789;
    std::string username = "expiringuser";
    // Configured for 1 second expiration
    std::string token = JwtManager::generateToken(user_id, username);

    // Wait for more than 1 second
    std::this_thread::sleep_for(std::chrono::seconds(2));

    ASSERT_THROW(JwtManager::verifyToken(token), jwt::error::token_verification_exception); // Should throw due to expiration
}

TEST_F(JwtManagerTest, ExtractUserIdFromToken) {
    int user_id = 100;
    std::string username = "extractor";
    std::string token = JwtManager::generateToken(user_id, username);

    std::optional<int> extracted_id = JwtManager::getUserIdFromToken(token);
    ASSERT_TRUE(extracted_id.has_value());
    ASSERT_EQ(extracted_id.value(), user_id);
}

TEST_F(JwtManagerTest, ExtractUsernameFromToken) {
    int user_id = 101;
    std::string username = "extractor_username";
    std::string token = JwtManager::generateToken(user_id, username);

    std::optional<std::string> extracted_username = JwtManager::getUsernameFromToken(token);
    ASSERT_TRUE(extracted_username.has_value());
    ASSERT_EQ(extracted_username.value(), username);
}

TEST_F(JwtManagerTest, ExtractClaimsFromInvalidToken) {
    std::string invalid_token = "clearly.not.a.jwt";
    ASSERT_FALSE(JwtManager::getUserIdFromToken(invalid_token).has_value());
    ASSERT_FALSE(JwtManager::getUsernameFromToken(invalid_token).has_value());
}
```