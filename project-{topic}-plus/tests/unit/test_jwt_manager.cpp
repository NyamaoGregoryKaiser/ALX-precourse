#include <gtest/gtest.h>
#include "../../src/utils/jwt_manager.h"
#include "../../src/utils/logger.h" // For Logger::init
#include <chrono>

class JwtManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize logger for tests, suppress output if desired
        Logger::init("off");
    }
};

TEST_F(JwtManagerTest, TokenGenerationAndVerificationSuccess) {
    std::string test_secret = "my_test_secret_key_that_is_long_enough";
    long expiration_seconds = 60; // 1 minute
    JwtManager jwt_manager(test_secret, expiration_seconds);

    std::string user_id = "user123";
    std::string username = "testuser";
    std::string email = "test@example.com";

    std::string token = jwt_manager.generateToken(user_id, username, email);
    ASSERT_FALSE(token.empty());

    auto decoded = jwt_manager.verifyToken(token);

    ASSERT_EQ(decoded.get_subject(), user_id);
    ASSERT_EQ(decoded.get_payload_claim("user_id").as_string(), user_id);
    ASSERT_EQ(decoded.get_payload_claim("username").as_string(), username);
    ASSERT_EQ(decoded.get_payload_claim("email").as_string(), email);
    ASSERT_EQ(decoded.get_issuer(), "project-management-api");
}

TEST_F(JwtManagerTest, TokenVerificationFailureWrongSecret) {
    std::string correct_secret = "my_correct_secret_key_that_is_long_enough";
    std::string wrong_secret = "my_wrong_secret_key_that_is_long_enough";
    long expiration_seconds = 60;
    JwtManager correct_jwt_manager(correct_secret, expiration_seconds);
    JwtManager wrong_jwt_manager(wrong_secret, expiration_seconds);

    std::string token = correct_jwt_manager.generateToken("user123", "testuser", "test@example.com");

    ASSERT_THROW(wrong_jwt_manager.verifyToken(token), jwt::signature_verification_error);
}

TEST_F(JwtManagerTest, TokenVerificationFailureExpiredToken) {
    std::string test_secret = "my_test_secret_key_for_expiration";
    long expiration_seconds = 1; // 1 second
    JwtManager jwt_manager(test_secret, expiration_seconds);

    std::string token = jwt_manager.generateToken("user123", "testuser", "test@example.com");

    // Wait for token to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    ASSERT_THROW(jwt_manager.verifyToken(token), jwt::token_verification_error);
}

TEST_F(JwtManagerTest, TokenVerificationFailureInvalidIssuer) {
    std::string test_secret = "my_test_secret_key_for_issuer";
    long expiration_seconds = 60;
    JwtManager jwt_manager(test_secret, expiration_seconds);

    // Manually create a token with a different issuer
    auto token_builder = jwt::create()
        .set_issuer("wrong-issuer")
        .set_type("JWT")
        .set_subject("user123")
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds(expiration_seconds))
        .set_payload_claim("user_id", jwt::claim("user123"))
        .sign(jwt::algorithm::hs256{test_secret});

    std::string token_with_wrong_issuer = token_builder;

    ASSERT_THROW(jwt_manager.verifyToken(token_with_wrong_issuer), jwt::token_verification_error);
}

TEST_F(JwtManagerTest, EmptySecretThrowsError) {
    ASSERT_THROW(JwtManager("", 60), std::runtime_error); // jwt-cpp constructor will likely fail or lead to issues
}
```