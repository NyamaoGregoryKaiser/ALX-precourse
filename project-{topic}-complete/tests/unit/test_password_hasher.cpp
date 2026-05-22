```cpp
#include "gtest/gtest.h"
#include "utils/PasswordHasher.h"
#include "utils/Logger.h" // For test logging

class PasswordHasherTest : public ::testing::Test {
protected:
    void SetUp() override {
        Logger::init();
    }
    void TearDown() override {
        // No specific cleanup needed
    }
};

TEST_F(PasswordHasherTest, HashAndVerifyCorrectPassword) {
    std::string password = "mySecurePassword123";
    std::string hash = PasswordHasher::hashPassword(password);

    ASSERT_FALSE(hash.empty());
    ASSERT_NE(hash, password); // Hash should not be the plain password
    ASSERT_TRUE(PasswordHasher::verifyPassword(password, hash));
}

TEST_F(PasswordHasherTest, VerifyIncorrectPassword) {
    std::string password = "mySecurePassword123";
    std::string hash = PasswordHasher::hashPassword(password);

    std::string incorrect_password = "wrongPassword";
    ASSERT_FALSE(PasswordHasher::verifyPassword(incorrect_password, hash));
}

TEST_F(PasswordHasherTest, VerifyWithEmptyPassword) {
    std::string password = "";
    std::string hash = PasswordHasher::hashPassword(password);
    ASSERT_FALSE(hash.empty()); // Even empty password should generate a hash
    ASSERT_TRUE(PasswordHasher::verifyPassword("", hash));
    ASSERT_FALSE(PasswordHasher::verifyPassword("any", hash));
}

TEST_F(PasswordHasherTest, VerifyWithEmptyHash) {
    std::string password = "testPassword";
    std::string empty_hash = "";
    ASSERT_FALSE(PasswordHasher::verifyPassword(password, empty_hash));
}

TEST_F(PasswordHasherTest, DifferentHashesForSamePassword) {
    std::string password = "anotherPassword";
    std::string hash1 = PasswordHasher::hashPassword(password);
    std::string hash2 = PasswordHasher::hashPassword(password);

    // Argon2 generates different salts for each hash, so hashes should be different
    ASSERT_NE(hash1, hash2);
    // But both should verify correctly
    ASSERT_TRUE(PasswordHasher::verifyPassword(password, hash1));
    ASSERT_TRUE(PasswordHasher::verifyPassword(password, hash2));
}

TEST_F(PasswordHasherTest, HashWithLongPassword) {
    std::string long_password(256, 'a'); // 256 'a's
    std::string hash = PasswordHasher::hashPassword(long_password);
    ASSERT_FALSE(hash.empty());
    ASSERT_TRUE(PasswordHasher::verifyPassword(long_password, hash));
}
```