#include "gtest/gtest.h"
#include "../../src/utils/jwt_manager.h"
#include <chrono>

TEST(JWTManagerTest, GenerateAndVerifyToken_Success) {
    std::string secret = "my_test_secret_key";
    JWTManager jwt_manager(secret);

    long long user_id = 123;
    std::string username = "testuser";
    std::string role = "user";
    std::chrono::seconds expiry = std::chrono::seconds{60};

    std::string token = jwt_manager.generate_token(user_id, username, role, expiry);
    
    ASSERT_FALSE(token.empty());

    // Verify token
    bool is_valid = jwt_manager.verify_token(token);
    EXPECT_TRUE(is_valid);

    // Decode and check claims
    auto decoded = jwt_manager.decode_token(token);
    EXPECT_EQ(decoded.get_payload_claim("userId").as_string(), std::to_string(user_id));
    EXPECT_EQ(decoded.get_payload_claim("username").as_string(), username);
    EXPECT_EQ(decoded.get_payload_claim("role").as_string(), role);
    EXPECT_EQ(decoded.get_issuer(), "cms-backend");
}

TEST(JWTManagerTest, VerifyToken_Expired) {
    std::string secret = "my_test_secret_key";
    JWTManager jwt_manager(secret);

    // Generate a token with a very short expiry
    std::string token = jwt_manager.generate_token(1, "user", "role", std::chrono::seconds{1});

    // Wait for it to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));

    bool is_valid = jwt_manager.verify_token(token);
    EXPECT_FALSE(is_valid); // Should be expired
}

TEST(JWTManagerTest, VerifyToken_InvalidSecret) {
    std::string correct_secret = "my_test_secret_key";
    std::string wrong_secret = "wrong_secret_key";
    JWTManager correct_jwt_manager(correct_secret);
    JWTManager wrong_jwt_manager(wrong_secret);

    std::string token = correct_jwt_manager.generate_token(1, "user", "role");

    // Try to verify with wrong secret
    bool is_valid = wrong_jwt_manager.verify_token(token);
    EXPECT_FALSE(is_valid);
}

TEST(JWTManagerTest, DecodeToken_ValidClaims) {
    std::string secret = "test_secret";
    JWTManager jwt_manager(secret);

    std::string token = jwt_manager.generate_token(456, "editor", "editor_role");
    auto decoded = jwt_manager.decode_token(token);

    EXPECT_EQ(decoded.get_payload_claim("userId").as_string(), "456");
    EXPECT_EQ(decoded.get_payload_claim("username").as_string(), "editor");
    EXPECT_EQ(decoded.get_payload_claim("role").as_string(), "editor_role");
}

TEST(JWTManagerTest, DecodeToken_MalformedToken) {
    std::string secret = "test_secret";
    JWTManager jwt_manager(secret);

    std::string malformed_token = "abc.def.ghi";
    EXPECT_THROW(jwt_manager.decode_token(malformed_token), jwt::decode_error);
}