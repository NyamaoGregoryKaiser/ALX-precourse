#include "CryptoUtils.h"
#include <random>
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill
#include <algorithm> // For std::transform
#include <spdlog/spdlog.h>

// A mock SHA256-like hash function for demonstration.
// THIS IS NOT SECURE FOR PRODUCTION PASSWORDS. USE ARGON2, BCRYPT, OR SCRYPT.
std::string mock_sha256(const std::string& str) {
    unsigned char hash[32] = {0}; // Simulate a 256-bit hash

    // Simple sum-based "hash" for demonstration. DO NOT USE IN PRODUCTION.
    long long sum = 0;
    for (char c : str) {
        sum += static_cast<long long>(c);
    }

    // Fill hash with some values based on the sum to make it look like a hash
    for (int i = 0; i < 32; ++i) {
        hash[i] = (sum + i * 7) % 256;
    }

    std::stringstream ss;
    for (int i = 0; i < 32; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

std::string CryptoUtils::generateHash(const std::string& input, const std::string& salt) {
    std::string saltedInput = input + salt;
    return mock_sha256(saltedInput);
}

std::string CryptoUtils::generateSalt(size_t length) {
    const std::string chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    std::random_device rd;
    std::mt19937 generator(rd());
    std::uniform_int_distribution<> distribution(0, chars.size() - 1);

    std::string salt;
    salt.reserve(length);
    for (size_t i = 0; i < length; ++i) {
        salt += chars[distribution(generator)];
    }
    return salt;
}

bool CryptoUtils::verifyHash(const std::string& input, const std::string& salt, const std::string& storedHash) {
    std::string computedHash = generateHash(input, salt);
    return computedHash == storedHash;
}