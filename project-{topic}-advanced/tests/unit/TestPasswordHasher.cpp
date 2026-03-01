#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../../src/services/PasswordHasher.h"
#include <string>

// To make PasswordHasher tests reliable, you need a consistent `crypt` behavior
// or use a mock. For now, assuming `crypt` works as expected or testing the fallback.

TEST(PasswordHasherTest, HashAndVerifyPassword) {
    std::string plainPassword = "mySecretPassword123";
    std::string hashedPassword = PasswordHasher::hashPassword(plainPassword);

    ASSERT_FALSE(hashedPassword.empty());
    // Hashed password should not be the same as plain password
    ASSERT_NE(hashedPassword, plainPassword);

    // Verify correct password
    ASSERT_TRUE(PasswordHasher::verifyPassword(plainPassword, hashedPassword));

    // Verify incorrect password
    ASSERT_FALSE(PasswordHasher::verifyPassword("wrongPassword", hashedPassword));
}

TEST(PasswordHasherTest, VerifyEmptyPasswords) {
    // Empty plain password
    ASSERT_FALSE(PasswordHasher::verifyPassword("", "somehash"));
    // Empty hashed password
    ASSERT_FALSE(PasswordHasher::verifyPassword("plain", ""));
    // Both empty
    ASSERT_FALSE(PasswordHasher::verifyPassword("", ""));
}

TEST(PasswordHasherTest, HashingDifferentPasswordsYieldsDifferentHashes) {
    std::string p1 = "passwordA";
    std::string p2 = "passwordB";

    std::string h1 = PasswordHasher::hashPassword(p1);
    std::string h2 = PasswordHasher::hashPassword(p2);

    ASSERT_FALSE(h1.empty());
    ASSERT_FALSE(h2.empty());
    ASSERT_NE(h1, h2); // Different passwords should result in different hashes
}

TEST(PasswordHasherTest, HashingSamePasswordYieldsDifferentHashesWithSalt) {
    // Due to random salt in bcrypt, same password should yield different hashes
    std::string p = "consistentPassword";
    std::string h1 = PasswordHasher::hashPassword(p);
    std::string h2 = PasswordHasher::hashPassword(p);

    ASSERT_FALSE(h1.empty());
    ASSERT_FALSE(h2.empty());
    #ifdef CRYPT_BLOWFISH
        ASSERT_NE(h1, h2); // Only for bcrypt/salting
    #else
        ASSERT_EQ(h1, h2); // For non-salting hashes (like simple SHA256 fallback)
    #endif
}
```