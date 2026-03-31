#include <catch2/catch_test_macros.hpp>
#include "utils/CryptoUtils.h"
#include <string>
#include <set>

TEST_CASE("CryptoUtils generates distinct salts", "[CryptoUtils][Unit]") {
    SECTION("Salts of specified length") {
        std::string salt = CryptoUtils::generateSalt(32);
        REQUIRE(salt.length() == 32);
    }

    SECTION("Multiple salts are unique") {
        std::set<std::string> uniqueSalts;
        const int numSalts = 100;
        for (int i = 0; i < numSalts; ++i) {
            uniqueSalts.insert(CryptoUtils::generateSalt(16));
        }
        REQUIRE(uniqueSalts.size() == numSalts);
    }
}

TEST_CASE("CryptoUtils generates and verifies hashes", "[CryptoUtils][Unit]") {
    std::string password = "mySecurePassword123";
    std::string salt = CryptoUtils::generateSalt(); // Use a unique salt for each test case

    SECTION("Generated hash is consistent for same input and salt") {
        std::string hash1 = CryptoUtils::generateHash(password, salt);
        std::string hash2 = CryptoUtils::generateHash(password, salt);
        REQUIRE(hash1 == hash2);
    }

    SECTION("Generated hash is different for different input") {
        std::string hash1 = CryptoUtils::generateHash(password, salt);
        std::string hash2 = CryptoUtils::generateHash("anotherPassword", salt);
        REQUIRE(hash1 != hash2);
    }

    SECTION("Generated hash is different for different salt") {
        std::string salt2 = CryptoUtils::generateSalt();
        REQUIRE(salt != salt2); // Ensure salts are different
        std::string hash1 = CryptoUtils::generateHash(password, salt);
        std::string hash2 = CryptoUtils::generateHash(password, salt2);
        REQUIRE(hash1 != hash2);
    }

    SECTION("Verification succeeds for correct password") {
        std::string hashedPassword = CryptoUtils::generateHash(password, salt);
        REQUIRE(CryptoUtils::verifyHash(password, salt, hashedPassword));
    }

    SECTION("Verification fails for incorrect password") {
        std::string hashedPassword = CryptoUtils::generateHash(password, salt);
        REQUIRE_FALSE(CryptoUtils::verifyHash("wrongPassword", salt, hashedPassword));
    }

    SECTION("Verification fails for incorrect salt") {
        std::string hashedPassword = CryptoUtils::generateHash(password, salt);
        std::string wrongSalt = CryptoUtils::generateSalt();
        REQUIRE_FALSE(CryptoUtils::verifyHash(password, wrongSalt, hashedPassword));
    }
}