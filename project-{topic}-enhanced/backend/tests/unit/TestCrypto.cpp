```cpp
#include "gtest/gtest.h"
#include "../../src/utils/Crypto.h"
#include <string>

TEST(CryptoTest, Sha256ProducesConsistentHash) {
    std::string test_string = "hello world";
    std::string expected_hash = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
    ASSERT_EQ(Crypto::sha256(test_string), expected_hash);

    std::string another_string = "test string";
    std::string another_expected_hash = "d3230b77b752496a7927d627c9a490f23927656e1844a47c21f7c5a2789b7b20";
    ASSERT_EQ(Crypto::sha256(another_string), another_expected_hash);
}

TEST(CryptoTest, Sha256IsCaseSensitive) {
    std::string lower = "test";
    std::string upper = "TEST";
    ASSERT_NE(Crypto::sha256(lower), Crypto::sha256(upper));
}

TEST(CryptoTest, Sha256EmptyString) {
    std::string empty_string = "";
    std::string expected_hash_empty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    ASSERT_EQ(Crypto::sha256(empty_string), expected_hash_empty);
}

TEST(CryptoTest, HashPasswordProducesHash) {
    std::string password = "mysecretpassword123";
    std::string hashed_password = Crypto::hashPassword(password);
    ASSERT_FALSE(hashed_password.empty());
    ASSERT_NE(hashed_password, password); // Should not be plaintext
    // For SHA256, hash length should be 64 characters
    ASSERT_EQ(hashed_password.length(), 64);
}

TEST(CryptoTest, VerifyPasswordCorrect) {
    std::string password = "testpass";
    std::string hashed_password = Crypto::hashPassword(password);
    ASSERT_TRUE(Crypto::verifyPassword(password, hashed_password));
}

TEST(CryptoTest, VerifyPasswordIncorrect) {
    std::string password = "testpass";
    std::string incorrect_password = "wrongpass";
    std::string hashed_password = Crypto::hashPassword(password);
    ASSERT_FALSE(Crypto::verifyPassword(incorrect_password, hashed_password));
}

TEST(CryptoTest, VerifyPasswordDifferentHash) {
    std::string password = "testpass";
    std::string another_password = "anotherpass";
    std::string hashed_password = Crypto::hashPassword(password);
    std::string another_hashed_password = Crypto::hashPassword(another_password);
    ASSERT_FALSE(Crypto::verifyPassword(password, another_hashed_password));
}
```