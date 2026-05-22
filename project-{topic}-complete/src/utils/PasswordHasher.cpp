```cpp
#include "PasswordHasher.h"
#include "utils/Logger.h"
#include <argon2.h>
#include <random>
#include <array>
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill

// Parameters for Argon2d (or Argon2id for better side-channel attack resistance)
// These parameters are important for security and performance.
// Adjust as needed based on hardware and security requirements.
const int ARGON2_T_COST = 2; // Iterations
const int ARGON2_M_COST = 65536; // Memory cost (2^16 KB = 64 MB)
const int ARGON2_P_COST = 1; // Parallelism degree
const size_t ARGON2_SALT_LEN = 16; // 16 bytes is recommended
const size_t ARGON2_HASH_LEN = 32; // 32 bytes (256 bits) for the derived key

namespace PasswordHasher {

    std::string generateSalt(size_t length) {
        std::random_device rd;
        std::mt19937 generator(rd());
        std::uniform_int_distribution<> distrib(0, 255);

        std::string salt_str;
        salt_str.reserve(length);
        for (size_t i = 0; i < length; ++i) {
            salt_str += static_cast<char>(distrib(generator));
        }
        return salt_str;
    }

    std::string hashPassword(const std::string& password) {
        std::string salt = generateSalt(ARGON2_SALT_LEN);
        std::array<uint8_t, ARGON2_HASH_LEN> hash_bytes;
        
        char encoded_hash[ARGON2_MAX_ENCODED_LEN];

        int result = argon2id_hash_encoded(
            ARGON2_T_COST,
            ARGON2_M_COST,
            ARGON2_P_COST,
            password.data(),
            password.length(),
            reinterpret_cast<const uint8_t*>(salt.data()),
            salt.length(),
            ARGON2_HASH_LEN,
            encoded_hash,
            sizeof(encoded_hash)
        );

        if (result != ARGON2_OK) {
            LOG_ERROR("Argon2 hashing failed: {}", argon2_error_message(result));
            throw HashingException(std::string("Argon2 hashing failed: ") + argon2_error_message(result));
        }

        LOG_DEBUG("Password hashed successfully.");
        return std::string(encoded_hash);
    }

    bool verifyPassword(const std::string& password, const std::string& hash) {
        if (password.empty() || hash.empty()) {
            return false;
        }

        int result = argon2id_verify(
            hash.c_str(),
            password.data(),
            password.length()
        );

        if (result == ARGON2_OK) {
            LOG_DEBUG("Password verification successful.");
            return true;
        } else if (result == ARGON2_VERIFY_FAIL) {
            LOG_DEBUG("Password verification failed.");
            return false;
        } else {
            LOG_ERROR("Argon2 verification error: {}", argon2_error_message(result));
            // In case of an error, it's safer to treat it as a failed verification.
            // Production code might want to throw or log critical errors differently.
            return false;
        }
    }
}
```