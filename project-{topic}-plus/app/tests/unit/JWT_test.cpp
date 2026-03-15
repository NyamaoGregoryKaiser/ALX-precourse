#include <gtest/gtest.h>
#include "../../src/utils/JWT.h"
#include "../../src/utils/ErrorHandler.h"
#include "../../src/app_config.h"
#include <chrono>
#include <thread> // For sleeping to test expiration

class JWTTest : public ::testing::Test {
protected:
    long long test_user_id = 123;
    std::string test_username = "jwt_test_user";
    std::string test_role = "USER";
    std::string secret_key = AppConfig::JWT_SECRET_KEY; // Use app config's secret
};

// Test case for successful token generation and verification
TEST_F(JWTTest, GenerateAndVerifyTokenSuccessfully) {
    LOG_INFO("Running test: GenerateAndVerifyTokenSuccessfully");
    std::string token = JWT::generateToken(test_user_id, test_username, test_role);
    ASSERT_FALSE(token.empty());

    JWT::TokenClaims claims = JWT::verifyToken(token);
    ASSERT_EQ(claims.user_id, test_user_id);
    ASSERT_EQ(claims.username, test_username);
    ASSERT_EQ(claims.role, test_role);
}

// Test case for expired token verification
TEST_F(JWTTest, ExpiredTokenVerificationFails) {
    LOG_INFO("Running test: ExpiredTokenVerificationFails");
    // Generate a token that expires in 1 second
    std::string token = JWT::generateToken(test_user_id, test_username, test_role, std::chrono::seconds(1));

    // Wait for the token to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    ASSERT_THROW(JWT::verifyToken(token), UnauthorizedException);
}

// Test case for invalid signature verification
TEST_F(JWTTest, InvalidSignatureVerificationFails) {
    LOG_INFO("Running test: InvalidSignatureVerificationFails");
    std::string token = JWT::generateToken(test_user_id, test_username, test_role);
    
    // Tamper with the token (change a character in the payload to invalidate signature)
    std::string tampered_token = token.substr(0, token.length() - 5) + "AAAAA"; // Change last 5 chars
    
    ASSERT_THROW(JWT::verifyToken(tampered_token), UnauthorizedException);
}

// Test case for token signed with different secret key
TEST_F(JWTTest, TokenSignedWithDifferentSecretFails) {
    LOG_INFO("Running test: TokenSignedWithDifferentSecretFails");
    // Temporarily change AppConfig::JWT_SECRET_KEY for this test if possible,
    // or manually generate with a different key.
    
    // For demonstration, let's create a temporary token with a different secret
    std::string malicious_secret = "malicious_secret_key";
    
    auto malicious_token = jwt::create()
        .set_issuer(AppConfig::APP_NAME)
        .set_type("JWT")
        .set_subject(std::to_string(test_user_id))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::minutes(5))
        .set_payload_claim("user_id", jwt::claim(std::to_string(test_user_id)))
        .set_payload_claim("username", jwt::claim(test_username))
        .set_payload_claim("role", jwt::claim(test_role))
        .sign(jwt::algorithm::hs256{malicious_secret});

    // Attempt to verify with the legitimate secret key
    ASSERT_THROW(JWT::verifyToken(malicious_token), UnauthorizedException);
}

// Test case for malformed token
TEST_F(JWTTest, MalformedTokenVerificationFails) {
    LOG_INFO("Running test: MalformedTokenVerificationFails");
    std::string malformed_token = "invalid.token.string";
    ASSERT_THROW(JWT::verifyToken(malformed_token), UnauthorizedException);

    malformed_token = "only_one_part";
    ASSERT_THROW(JWT::verifyToken(malformed_token), UnauthorizedException);
}

// Test case for missing required claims
TEST_F(JWTTest, MissingClaimsVerificationFails) {
    LOG_INFO("Running test: MissingClaimsVerificationFails");
    // Create a token without 'user_id' claim (or others that verifyToken expects)
    auto token_without_user_id = jwt::create()
        .set_issuer(AppConfig::APP_NAME)
        .set_type("JWT")
        .set_subject(test_username) // Subject but not user_id claim
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::minutes(5))
        .set_payload_claim("username", jwt::claim(test_username))
        .set_payload_claim("role", jwt::claim(test_role))
        .sign(jwt::algorithm::hs256{secret_key});

    ASSERT_THROW(JWT::verifyToken(token_without_user_id), UnauthorizedException);
}