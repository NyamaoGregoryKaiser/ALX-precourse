#include <gtest/gtest.h>
#include "../../src/utils/JwtUtils.h"
#include "../../src/logger/Logger.h"
#include <chrono>

TEST(JwtUtilsTest, GenerateAndDecodeValidToken) {
    Logger::init_logger("debug");
    std::string secret = JwtUtils::generateRandomSecret(64);
    
    JwtUtils::Claims claims;
    claims.user_id = "test_user_123";
    claims.role = "customer";
    claims.exp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count() + 3600; // 1 hour expiry

    std::string token = JwtUtils::encode(claims, secret);
    ASSERT_FALSE(token.empty());

    std::optional<JwtUtils::Claims> decoded_claims = JwtUtils::decode(token, secret);
    ASSERT_TRUE(decoded_claims.has_value());
    ASSERT_EQ(decoded_claims->user_id, claims.user_id);
    ASSERT_EQ(decoded_claims->role, claims.role);
    ASSERT_EQ(decoded_claims->exp, claims.exp);
}

TEST(JwtUtilsTest, DecodeInvalidSignature) {
    Logger::init_logger("debug");
    std::string secret = JwtUtils::generateRandomSecret(64);
    std::string wrong_secret = JwtUtils::generateRandomSecret(64);

    JwtUtils::Claims claims;
    claims.user_id = "test_user_123";
    claims.role = "customer";
    claims.exp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count() + 3600;

    std::string token = JwtUtils::encode(claims, secret);
    
    std::optional<JwtUtils::Claims> decoded_claims = JwtUtils::decode(token, wrong_secret); // Use wrong secret
    ASSERT_FALSE(decoded_claims.has_value());
}

TEST(JwtUtilsTest, DecodeExpiredToken) {
    Logger::init_logger("debug");
    std::string secret = JwtUtils::generateRandomSecret(64);

    JwtUtils::Claims claims;
    claims.user_id = "expired_user";
    claims.role = "customer";
    claims.exp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count() - 10; // 10 seconds in the past

    std::string token = JwtUtils::encode(claims, secret);

    std::optional<JwtUtils::Claims> decoded_claims = JwtUtils::decode(token, secret);
    ASSERT_FALSE(decoded_claims.has_value());
}

TEST(JwtUtilsTest, DecodeMalformedToken) {
    Logger::init_logger("debug");
    std::string secret = JwtUtils::generateRandomSecret(64);

    std::string malformed_token = "header.payload"; // Missing signature
    std::optional<JwtUtils::Claims> decoded_claims = JwtUtils::decode(malformed_token, secret);
    ASSERT_FALSE(decoded_claims.has_value());

    malformed_token = "invalid-base64.invalid-base64.signature";
    decoded_claims = JwtUtils::decode(malformed_token, secret);
    ASSERT_FALSE(decoded_claims.has_value());
}

TEST(JwtUtilsTest, GenerateRandomSecretLength) {
    std::string secret1 = JwtUtils::generateRandomSecret(32);
    ASSERT_EQ(secret1.length(), 32);

    std::string secret2 = JwtUtils::generateRandomSecret(64);
    ASSERT_EQ(secret2.length(), 64);
}