#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/services/JWTHelper.h"
#include "../../src/constants/AppConstants.h"
#include <thread>
#include <chrono>

TEST(JWTHelperTest, GenerateAndVerifyToken) {
    std::string secret = "test_secret_key_123";
    int64_t userId = 1;
    std::string username = "testuser";
    std::vector<std::string> roles = {"user", "editor"};
    int expirationSeconds = 5; // Short expiration for test

    std::string token = JWTHelper::generateToken(userId, username, roles, secret, expirationSeconds);
    ASSERT_FALSE(token.empty());

    auto claims = JWTHelper::verifyToken(token, secret);
    ASSERT_TRUE(claims.has_value());

    ASSERT_EQ(claims.value()["userId"].asString(), std::to_string(userId));
    ASSERT_EQ(claims.value()["username"].asString(), username);
    ASSERT_TRUE(claims.value()["roles"].isArray());
    ASSERT_EQ(claims.value()["roles"][0].asString(), "user");
    ASSERT_EQ(claims.value()["roles"][1].asString(), "editor");
    ASSERT_EQ(claims.value()["iss"].asString(), AppConstants::JWT_ISSUER);
    ASSERT_EQ(claims.value()["aud"].asString(), AppConstants::JWT_AUDIENCE);
}

TEST(JWTHelperTest, VerifyExpiredTokenFails) {
    std::string secret = "test_secret_key_456";
    int64_t userId = 2;
    std::string username = "expiringuser";
    std::vector<std::string> roles = {"user"};
    int expirationSeconds = 1; // Expire quickly

    std::string token = JWTHelper::generateToken(userId, username, roles, secret, expirationSeconds);
    ASSERT_FALSE(token.empty());

    // Wait for token to expire
    std::this_thread::sleep_for(std::chrono::seconds(expirationSeconds + 1));

    auto claims = JWTHelper::verifyToken(token, secret);
    ASSERT_FALSE(claims.has_value()); // Should fail verification
}

TEST(JWTHelperTest, VerifyInvalidSecretFails) {
    std::string secret = "correct_secret";
    std::string wrongSecret = "wrong_secret";
    int64_t userId = 3;
    std::string username = "badsecret";
    std::vector<std::string> roles = {"user"};
    int expirationSeconds = 10;

    std::string token = JWTHelper::generateToken(userId, username, roles, secret, expirationSeconds);
    ASSERT_FALSE(token.empty());

    auto claims = JWTHelper::verifyToken(token, wrongSecret);
    ASSERT_FALSE(claims.has_value()); // Should fail verification
}

TEST(JWTHelperTest, DecodeToken) {
    std::string secret = "decode_secret_key";
    int64_t userId = 4;
    std::string username = "decoder";
    std::vector<std::string> roles = {"guest"};
    int expirationSeconds = 60;

    std::string token = JWTHelper::generateToken(userId, username, roles, secret, expirationSeconds);
    ASSERT_FALSE(token.empty());

    auto claims = JWTHelper::decodeToken(token);
    ASSERT_TRUE(claims.has_value());

    // Decode doesn't verify signature or expiration, just parses payload
    ASSERT_EQ(claims.value()["userId"].asString(), std::to_string(userId));
    ASSERT_EQ(claims.value()["username"].asString(), username);
    ASSERT_TRUE(claims.value()["roles"].isArray());
    ASSERT_EQ(claims.value()["roles"][0].asString(), "guest");
}

TEST(JWTHelperTest, EmptySecretHandling) {
    std::string secret = ""; // Empty secret
    int64_t userId = 5;
    std::string username = "nosecret";
    std::vector<std::string> roles = {"user"};
    int expirationSeconds = 60;

    std::string token = JWTHelper::generateToken(userId, username, roles, secret, expirationSeconds);
    ASSERT_TRUE(token.empty()); // Should return empty token

    auto claims = JWTHelper::verifyToken("any.token.string", secret);
    ASSERT_FALSE(claims.has_value()); // Should fail verification with empty secret
}
```