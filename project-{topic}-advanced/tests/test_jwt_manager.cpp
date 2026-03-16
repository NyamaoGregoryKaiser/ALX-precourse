```cpp
#include "gtest/gtest.h"
#include "../src/utils/jwt_manager.h"
#include <chrono>
#include <thread>

using namespace mobile_backend::utils;

// Define a test secret key
const std::string TEST_JWT_SECRET = "thisisalongandsecuretestsecretkeyforjwtpurposes123";

TEST(JwtManagerTest, CreateAndVerifyTokenSuccess) {
    JwtManager jwt_manager(TEST_JWT_SECRET);
    int user_id = 123;
    std::string username = "testuser";

    std::string token = jwt_manager.create_token(user_id, username);
    ASSERT_FALSE(token.empty());

    std::optional<int> verified_user_id = jwt_manager.verify_token(token);
    ASSERT_TRUE(verified_user_id.has_value());
    ASSERT_EQ(verified_user_id.value(), user_id);
}

TEST(JwtManagerTest, VerifyInvalidToken) {
    JwtManager jwt_manager(TEST_JWT_SECRET);
    std::string invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"; // A known invalid token example
    
    std::optional<int> verified_user_id = jwt_manager.verify_token(invalid_token);
    ASSERT_FALSE(verified_user_id.has_value());
}

TEST(JwtManagerTest, VerifyTokenWithWrongSecret) {
    JwtManager jwt_manager_correct_secret(TEST_JWT_SECRET);
    JwtManager jwt_manager_wrong_secret("wrong_secret_key_12345678901234567890");

    std::string token = jwt_manager_correct_secret.create_token(1, "user1");
    ASSERT_FALSE(token.empty());

    std::optional<int> verified_user_id = jwt_manager_wrong_secret.verify_token(token);
    ASSERT_FALSE(verified_user_id.has_value());
}

TEST(JwtManagerTest, TokenExpires) {
    // For this test, we need to create a token with a very short expiry
    // jwt-cpp doesn't directly expose expiry setting with std::chrono::seconds,
    // but we can ensure it's short. Default is 24 hours.
    // To properly test expiry, we'd need to mock system clock or adjust jwt-cpp behavior,
    // or use a custom claim for expiry in seconds.
    // For the sake of demonstration, we'll assume default 24h is enough for "long lived"
    // and manually mock a very short lived token for a more direct test.
    // This requires direct jwt-cpp manipulation or a custom `create_token` that accepts TTL.
    // Given the current `create_token` uses 24 hours, this test won't simulate immediate expiry.
    // I'll simulate a token that's *already* expired by setting expiry in the past.

    JwtManager jwt_manager(TEST_JWT_SECRET);
    int user_id = 2;
    std::string username = "expiring_user";

    // Create a token that expired 1 second ago
    auto token = jwt::create()
        .set_issuer("mobile-backend-service")
        .set_type("JWT")
        .set_subject(std::to_string(user_id))
        .set_payload_claim("username", jwt::claim(username))
        .set_expires_at(std::chrono::system_clock::now() - std::chrono::seconds{1}) // Expired!
        .sign(jwt::algorithm::hs256{TEST_JWT_SECRET});

    // Verify token should fail
    std::optional<int> verified_user_id = jwt_manager.verify_token(token);
    ASSERT_FALSE(verified_user_id.has_value());
}

TEST(JwtManagerTest, EmptySecretKeyHandling) {
    JwtManager jwt_manager_empty(""); // Empty secret
    
    // Create token should fail
    std::string token = jwt_manager_empty.create_token(1, "nosrcuser");
    ASSERT_TRUE(token.empty());

    // Verify token should fail gracefully (no crash)
    std::optional<int> verified_user_id = jwt_manager_empty.verify_token("anytoken");
    ASSERT_FALSE(verified_user_id.has_value());
}

TEST(JwtManagerTest, ShortSecretKeyWarning) {
    // The constructor logs a warning for short keys. This test won't directly
    // assert the log, but ensures the manager still functions (though insecurely).
    JwtManager jwt_manager_short("short_key");
    std::string token = jwt_manager_short.create_token(1, "shortkeyuser");
    ASSERT_FALSE(token.empty());
    ASSERT_TRUE(jwt_manager_short.verify_token(token).has_value());
}

TEST(JwtManagerTest, ValidTokenPayloadClaims) {
    JwtManager jwt_manager(TEST_JWT_SECRET);
    int user_id = 456;
    std::string username = "claim_user";

    std::string token_str = jwt_manager.create_token(user_id, username);
    ASSERT_FALSE(token_str.empty());

    // Manually decode to check claims (or extend verify_token to return claims)
    auto decoded_token = jwt::decode(token_str);
    
    ASSERT_EQ(decoded_token.get_subject(), std::to_string(user_id));
    ASSERT_EQ(decoded_token.get_payload_claims()["username"].as_string(), username);
    ASSERT_EQ(decoded_token.get_issuer(), "mobile-backend-service");
}
```