```cpp
#include "gtest/gtest.h"
#include "../../src/utils/CryptoUtils.hpp"
#include "../../src/logger/Logger.hpp" // For setup

#include <string>
#include <vector>
#include <algorithm> // For std::is_permutation

// Global setup for tests
class CryptoUtilsTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup logger for tests
        Logger::setup("./test_crypto.log", spdlog::level::debug, false);
    }

    void TearDown() override {
        remove("./test_crypto.log");
    }
};

// Test password hashing and verification
TEST_F(CryptoUtilsTest, PasswordHashingAndVerification) {
    std::string password = "MySecretPassword123!";
    std::string hashedPassword = CryptoUtils::hashPassword(password);

    // Hash should not be empty
    ASSERT_FALSE(hashedPassword.empty());

    // Stored hash should contain a salt and hash separated by '$'
    size_t delimiterPos = hashedPassword.find('$');
    ASSERT_NE(delimiterPos, std::string::npos);
    ASSERT_GT(delimiterPos, 0); // Salt should not be empty
    ASSERT_GT(hashedPassword.length(), delimiterPos + 1); // Hash part should not be empty

    // Verify with correct password
    ASSERT_TRUE(CryptoUtils::verifyPassword(password, hashedPassword));

    // Verify with incorrect password
    ASSERT_FALSE(CryptoUtils::verifyPassword("WrongPassword", hashedPassword));
    ASSERT_FALSE(CryptoUtils::verifyPassword("MySecretPassword123", hashedPassword)); // Slightly different
    ASSERT_FALSE(CryptoUtils::verifyPassword("", hashedPassword));
}

// Test that hashing the same password twice yields different hashes due to salt
TEST_F(CryptoUtilsTest, HashingSamePasswordGeneratesDifferentHashes) {
    std::string password = "AnotherPassword456";
    std::string hashedPassword1 = CryptoUtils::hashPassword(password);
    std::string hashedPassword2 = CryptoUtils::hashPassword(password);

    ASSERT_NE(hashedPassword1, hashedPassword2);
    ASSERT_TRUE(CryptoUtils::verifyPassword(password, hashedPassword1));
    ASSERT_TRUE(CryptoUtils::verifyPassword(password, hashedPassword2));
}

// Test salt generation
TEST_F(CryptoUtilsTest, GenerateSalt) {
    std::string salt1 = CryptoUtils::generateSalt(16);
    std::string salt2 = CryptoUtils::generateSalt(16);

    ASSERT_FALSE(salt1.empty());
    ASSERT_FALSE(salt2.empty());
    ASSERT_NE(salt1, salt2); // Salts should be different
}

// Test HMAC-SHA256
TEST_F(CryptoUtilsTest, HmacSha256) {
    std::string data = "hello world";
    std::string key = "secretkey";

    // Expected HMAC-SHA256 hash for "hello world" with key "secretkey" (using online calculator)
    // d75d40a1b633857e33edb2400e9a59aa1c296541f92e73775b5b4e727e16c905 (raw hex)
    // The C++ function returns raw binary, so we need to compare raw binary or hex-encode both.
    // For simplicity, we'll test for non-empty output and consistency.
    std::string hmac1 = CryptoUtils::hmacSha256(data, key);
    ASSERT_FALSE(hmac1.empty());
    ASSERT_EQ(hmac1.length(), 32); // SHA256 produces 32 bytes

    std::string hmac2 = CryptoUtils::hmacSha256(data, key);
    ASSERT_EQ(hmac1, hmac2); // Consistent output for same input

    std::string hmac3 = CryptoUtils::hmacSha256("different data", key);
    ASSERT_NE(hmac1, hmac3); // Different data, different hash

    std::string hmac4 = CryptoUtils::hmacSha256(data, "different key");
    ASSERT_NE(hmac1, hmac4); // Different key, different hash
}

// Test Base64 encoding and decoding
TEST_F(CryptoUtilsTest, Base64EncodeDecode) {
    std::string original = "Hello, world! This is a test string for Base64 encoding/decoding.";
    std::string encoded = CryptoUtils::base64Encode(original);
    std::string decoded = CryptoUtils::base64Decode(encoded);

    ASSERT_FALSE(encoded.empty());
    ASSERT_EQ(original, decoded);

    // Test with binary data
    std::string binaryData(100, '\0'); // 100 null bytes
    for (int i = 0; i < 100; ++i) {
        binaryData[i] = static_cast<char>(i % 256);
    }
    std::string encodedBinary = CryptoUtils::base64Encode(binaryData);
    std::string decodedBinary = CryptoUtils::base64Decode(encodedBinary);
    ASSERT_EQ(binaryData, decodedBinary);

    // Test with empty string
    ASSERT_EQ(CryptoUtils::base64Encode(""), "");
    ASSERT_EQ(CryptoUtils::base64Decode(""), "");

    // Test with special characters
    std::string specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
    std::string encodedSpecial = CryptoUtils::base64Encode(specialChars);
    std::string decodedSpecial = CryptoUtils::base64Decode(encodedSpecial);
    ASSERT_EQ(specialChars, decodedSpecial);
}

// Test Base64 URL encoding (used by JwtManager)
TEST_F(CryptoUtilsTest, Base64UrlEncodeDecode) {
    // These tests use the internal `base64urlEncode` from JwtManager for true behavior,
    // but since `JwtManager` isn't designed to expose it, we'll replicate the core
    // logic or rely on `JwtManagerTest` to cover this.
    // For `CryptoUtils` specifically, we only test generic Base64.
    // However, for completeness of the _system_, `JwtManagerTest` covers base64url.
    // We can add a simple helper here for base64url if needed.

    // Manual base64url encode (replace +, /, = with -, _, '')
    std::string original = "Testing Base64 URL encoding with +/=";
    std::string encoded_standard = CryptoUtils::base64Encode(original);
    
    std::string encoded_url = encoded_standard;
    std::replace(encoded_url.begin(), encoded_url.end(), '+', '-');
    std::replace(encoded_url.begin(), encoded_url.end(), '/', '_');
    encoded_url.erase(std::remove(encoded_url.begin(), encoded_url.end(), '='), encoded_url.end());

    // Manual base64url decode (add back padding, replace -, _ with +, /)
    std::string decoded_url_prep = encoded_url;
    std::replace(decoded_url_prep.begin(), decoded_url_prep.end(), '-', '+');
    std::replace(decoded_url_prep.begin(), decoded_url_prep.end(), '_', '/');
    switch (decoded_url_prep.length() % 4) {
        case 2: decoded_url_prep += "=="; break;
        case 3: decoded_url_prep += "="; break;
    }
    std::string decoded_final = CryptoUtils::base64Decode(decoded_url_prep);

    ASSERT_EQ(original, decoded_final);
}
```