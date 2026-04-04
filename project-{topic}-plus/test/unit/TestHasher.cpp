#include <gtest/gtest.h>
#include "utils/Hasher.h"
#include <string>

// Mock Logger for tests if not fully initialized
namespace tm_api { namespace utils { namespace {
    void init_test_logger() {
        // Suppress logging during tests or redirect to a test file
        // For simplicity, we'll just ensure Logger is callable, or mock it if needed.
        // For actual production, a test-specific log configuration would be better.
        // Logger::init(spdlog::level::off); // Example: turn off logging
    }
}}}

TEST(HasherTest, GenerateAndVerifyPassword) {
    tm_api::utils::init_test_logger();
    std::string password = "mySecurePassword123!";
    std::string hashedPassword = tm_api::utils::Hasher::hashPassword(password);

    // Hash should be non-empty and different from original password
    ASSERT_FALSE(hashedPassword.empty());
    ASSERT_NE(hashedPassword, password);

    // Verify correct password
    ASSERT_TRUE(tm_api::utils::Hasher::verifyPassword(password, hashedPassword));

    // Verify incorrect password
    ASSERT_FALSE(tm_api::utils::Hasher::verifyPassword("wrongPassword", hashedPassword));
    ASSERT_FALSE(tm_api::utils::Hasher::verifyPassword(password + "extra", hashedPassword));
}

TEST(HasherTest, EmptyPasswordHandling) {
    tm_api::utils::init_test_logger();
    std::string emptyPassword = "";
    std::string hashedPassword = tm_api::utils::Hasher::hashPassword(emptyPassword);
    ASSERT_FALSE(hashedPassword.empty()); // Should still produce a hash, but very weak security
    ASSERT_TRUE(tm_api::utils::Hasher::verifyPassword(emptyPassword, hashedPassword));
}

TEST(HasherTest, LongPasswordHandling) {
    tm_api::utils::init_test_logger();
    std::string longPassword(200, 'a'); // 200 character password
    std::string hashedPassword = tm_api::utils::Hasher::hashPassword(longPassword);
    ASSERT_FALSE(hashedPassword.empty());
    ASSERT_TRUE(tm_api::utils::Hasher::verifyPassword(longPassword, hashedPassword));
}

TEST(HasherTest, HashConsistencyWithSameInput) {
    tm_api::utils::init_test_logger();
    std::string password = "testPassword";
    // Hashing with a proper algorithm like Argon2/bcrypt is non-deterministic
    // meaning two hashes of the same password will be different.
    // So, we test verification, not hash equality.
    std::string hash1 = tm_api::utils::Hasher::hashPassword(password);
    std::string hash2 = tm_api::utils::Hasher::hashPassword(password);

    ASSERT_NE(hash1, hash2); // Expected for secure hashing algorithms (due to salt)
    ASSERT_TRUE(tm_api::utils::Hasher::verifyPassword(password, hash1));
    ASSERT_TRUE(tm_api::utils::Hasher::verifyPassword(password, hash2));
}