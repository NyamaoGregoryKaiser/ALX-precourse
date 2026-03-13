#include <gtest/gtest.h>
#include "../../src/auth/jwt_manager.hpp"
#include <chrono>

const std::string TEST_SECRET = "this_is_a_very_secret_key_for_testing_purposes_only"; // Must be >= 32 chars
const std::string INSECURE_SECRET = "short";

TEST(JwtManagerTest, ConstructorThrowsOnInsecureSecret) {
    ASSERT_THROW(cms::auth::JwtManager jwt(INSECURE_SECRET), std::runtime_error);
}

TEST(JwtManagerTest, CreateAndVerifyToken) {
    cms::auth::JwtManager jwt(TEST_SECRET);
    std::string userId = "test_user_id";
    std::string username = "test_user";
    std::string role = "viewer";

    std::string token = jwt.create_token(userId, username, role, std::chrono::seconds(3600)); // 1 hour expiry
    ASSERT_FALSE(token.empty());

    std::optional<cms::auth::JwtPayload> payload = jwt.verify_token(token);
    ASSERT_TRUE(payload);
    ASSERT_EQ(payload->user_id, userId);
    ASSERT_EQ(payload->username, username);
    ASSERT_EQ(payload->role, role);
}

TEST(JwtManagerTest, VerifyInvalidToken) {
    cms::auth::JwtManager jwt(TEST_SECRET);
    std::string invalidToken = "invalid.jwt.token";
    std::optional<cms::auth::JwtPayload> payload = jwt.verify_token(invalidToken);
    ASSERT_FALSE(payload);
}

TEST(JwtManagerTest, VerifyExpiredToken) {
    cms::auth::JwtManager jwt(TEST_SECRET);
    std::string userId = "expired_user";
    std::string username = "expired_user_name";
    std::string role = "editor";

    // Create a token that expires immediately
    std::string token = jwt.create_token(userId, username, role, std::chrono::seconds(0));
    ASSERT_FALSE(token.empty());

    // Give a small delay to ensure it's expired for the verifier
    std::this_thread::sleep_for(std::chrono::milliseconds(10));

    std::optional<cms::auth::JwtPayload> payload = jwt.verify_token(token);
    ASSERT_FALSE(payload); // Should be expired
}

TEST(JwtManagerTest, VerifyTokenWithDifferentSecret) {
    cms::auth::JwtManager jwt1(TEST_SECRET);
    cms::auth::JwtManager jwt2("another_secret_key_for_testing_different_secret_logic");

    std::string userId = "user_diff_secret";
    std::string username = "user_diff_secret_name";
    std::string role = "admin";

    std::string token = jwt1.create_token(userId, username, role, std::chrono::seconds(3600));

    // Try to verify with a different secret manager
    std::optional<cms::auth::JwtPayload> payload = jwt2.verify_token(token);
    ASSERT_FALSE(payload); // Should fail verification
}

TEST(JwtManagerTest, TokenClaimsPresence) {
    cms::auth::JwtManager jwt(TEST_SECRET);
    std::string userId = "claim_test_user";
    std::string username = "claim_test";
    std::string role = "viewer";

    std::string token = jwt.create_token(userId, username, role, std::chrono::seconds(3600));
    auto decoded = jwt::decode(token);

    ASSERT_TRUE(decoded.has_payload_claim("user_id"));
    ASSERT_TRUE(decoded.has_payload_claim("username"));
    ASSERT_TRUE(decoded.has_payload_claim("role"));
    ASSERT_TRUE(decoded.has_expires_at());
    ASSERT_TRUE(decoded.has_issued_at());
    ASSERT_TRUE(decoded.has_id());
    ASSERT_TRUE(decoded.has_issuer());

    ASSERT_EQ(decoded.get_payload_claim("user_id").as_string(), userId);
    ASSERT_EQ(decoded.get_payload_claim("username").as_string(), username);
    ASSERT_EQ(decoded.get_payload_claim("role").as_string(), role);
    ASSERT_EQ(decoded.get_issuer(), "cms-system");
}
```