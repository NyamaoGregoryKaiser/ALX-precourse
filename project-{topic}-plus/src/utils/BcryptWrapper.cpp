#include "BcryptWrapper.h"
#include "../logger/Logger.h"
#include <crypt.h> // For crypt_blowfish or libcrypt on Linux
#include <stdexcept>
#include <random>
#include <array>

// For simplicity, hardcode salt prefix and rounds.
// In production, consider dynamic generation or configuration.
const std::string BCRYPT_SALT_PREFIX = "$2a$10$"; // 2a for Blowfish, 10 rounds

namespace BcryptWrapper {

std::string generateSalt() {
    std::string salt_chars = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    std::random_device rd;
    std::mt19937 generator(rd());
    std::uniform_int_distribution<> distribution(0, salt_chars.size() - 1);

    std::string salt = BCRYPT_SALT_PREFIX;
    for (int i = 0; i < 22; ++i) { // 22 characters for salt
        salt += salt_chars[distribution(generator)];
    }
    return salt;
}

std::string hashPassword(const std::string& password) {
    try {
        std::string salt = generateSalt();
        char* hashed_c_str = crypt(password.c_str(), salt.c_str());
        if (hashed_c_str == nullptr) {
            Logger::get_logger()->error("Bcrypt hashing failed for unknown reason.");
            throw std::runtime_error("Password hashing failed.");
        }
        return std::string(hashed_c_str);
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception during password hashing: {}", e.what());
        throw std::runtime_error("Password hashing failed: " + std::string(e.what()));
    }
}

bool checkPassword(const std::string& password, const std::string& hash) {
    try {
        // crypt() uses the salt from the hash to re-hash the password
        char* hashed_c_str = crypt(password.c_str(), hash.c_str());
        if (hashed_c_str == nullptr) {
            Logger::get_logger()->error("Bcrypt checking failed for unknown reason.");
            return false;
        }
        return hash == std::string(hashed_c_str);
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception during password checking: {}", e.what());
        return false;
    }
}

} // namespace BcryptWrapper