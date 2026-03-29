```cpp
#include "gtest/gtest.h"
#include "../../src/server/utils/TokenManager.h"
#include "../../src/config/Config.h" // For JWT_SECRET
#include <jwt-cpp/jwt.h>

class TokenManagerTest : public ::testing::Test {
protected:
    std::string test_secret = "test_super_secret_key_1234567890";
    int test_user_id = 1;
    std::string test_user_role = "user";

    void SetUp() override {
        // Ensure Config is loaded, or mock it for isolated testing
        // For this test, we'll manually use a test_secret
    }
};

TEST_F(TokenManagerTest, GenerateAndVerifyToken) {
    std::string token = TokenManager::generateToken(test_user_id, test_user_role, test_secret);
    ASSERT_FALSE(token.empty());

    auto decoded = TokenManager::verifyToken(token, test_secret);

    ASSERT_EQ(decoded.get_payload_claim("user_id").as_string(), std::to_string(test_user_id));
    ASSERT_EQ(decoded.get_payload_claim("role").as_string(), test_user_role);
    ASSERT_EQ(decoded.get_issuer(), "DataVizSystem");
}

TEST_F(TokenManagerTest, VerifyTokenWithWrongSecretFails) {
    std::string token = TokenManager::generateToken(test_user_id, test_user_role, test_secret);
    ASSERT_FALSE(token.empty());

    std::string wrong_secret = "wrong_secret";
    ASSERT_THROW(TokenManager::verifyToken(token, wrong_secret), jwt::verification_error);
}

TEST_F(TokenManagerTest, VerifyTokenWithExpiredTokenFails) {
    // Generate a token with a very short expiry time
    std::string short_lived_token = jwt::create()
        .set_issuer("DataVizSystem")
        .set_type("JWT")
        .set_subject(std::to_string(test_user_id))
        .set_issued_at(std::chrono::system_clock::now() - std::chrono::hours(1)) // Issued in the past
        .set_expires_at(std::chrono::system_clock::now() - std::chrono::minutes(1)) // Expired 1 minute ago
        .set_payload_claim("user_id", jwt::claim(std::to_string(test_user_id)))
        .set_payload_claim("role", jwt::claim(test_user_role))
        .sign(jwt::algorithm::hs256{test_secret});

    ASSERT_THROW(TokenManager::verifyToken(short_lived_token, test_secret), jwt::verification_error);
}

TEST_F(TokenManagerTest, VerifyTokenWithInvalidIssuerFails) {
    // Generate a token with a different issuer
    std::string token_with_bad_issuer = jwt::create()
        .set_issuer("BadIssuer")
        .set_type("JWT")
        .set_subject(std::to_string(test_user_id))
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours(1))
        .set_payload_claim("user_id", jwt::claim(std::to_string(test_user_id)))
        .set_payload_claim("role", jwt::claim(test_user_role))
        .sign(jwt::algorithm::hs256{test_secret});

    // The verifier expects "DataVizSystem"
    ASSERT_THROW(TokenManager::verifyToken(token_with_bad_issuer, test_secret), jwt::verification_error);
}
```