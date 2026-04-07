```cpp
#include "user_service.h"
#include <stdexcept>
#include <vector>
#include <random> // For salt generation

// Placeholder for CryptoUtil functions - In a real project, use a robust crypto library.
namespace CryptoUtil {
    std::string generateSalt() {
        // In real app: generate cryptographically secure random salt
        static const char charset[] = "0123456789"
                                      "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                                      "abcdefghijklmnopqrstuvwxyz";
        std::string salt;
        salt.reserve(16);
        std::random_device rd;
        std::mt19937 generator(rd());
        std::uniform_int_distribution<> distribution(0, sizeof(charset) - 2);

        for (int i = 0; i < 16; ++i) { // 16-byte salt
            salt += charset[distribution(generator)];
        }
        return salt;
    }

    std::string hashPassword(const std::string& password, const std::string& salt) {
        // In real app: use PBKDF2 with SHA256, many iterations
        // For demonstration, a simple SHA256 hash of password + salt
        CryptoPP::SHA256 hash;
        std::string digest;
        CryptoPP::StringSource s(password + salt, true,
            new CryptoPP::HashFilter(hash,
                new CryptoPP::HexEncoder(
                    new CryptoPP::StringSink(digest)
                ) // HexEncoder
            ) // HashFilter
        ); // StringSource
        return digest;
    }

    bool verifyPassword(const std::string& password, const std::string& salt, const std::string& storedHash) {
        return hashPassword(password, salt) == storedHash;
    }
}

UserService::UserService(UserRepository& userRepo) : userRepo(userRepo) {}

std::pair<std::optional<User>, std::string> UserService::registerUser(const std::string& username, const std::string& email, const std::string& password) {
    if (username.empty() || email.empty() || password.empty()) {
        throw BadRequestException("Username, email, and password cannot be empty.");
    }
    if (password.length() < 8) {
        throw BadRequestException("Password must be at least 8 characters long.");
    }

    if (userRepo.findByUsername(username).has_value()) {
        throw ConflictException("Username already taken.");
    }
    if (userRepo.findByEmail(email).has_value()) {
        throw ConflictException("Email already registered.");
    }

    // Hash password with a salt (simplified for example)
    std::string salt = CryptoUtil::generateSalt(); // In real app, store salt with user or derive
    std::string passwordHash = CryptoUtil::hashPassword(password, salt);
    // For this example, we're storing hash directly. A robust system stores hash and salt separately or uses a format like "hash:salt".
    // For simplicity with the User model, we'll concatenate salt and hash (e.g., "salt$hash") or just use the hash for now.
    // Let's assume the stored hash implicitly includes salt for verification (e.g., salt is part of passwordHash structure)
    // For the current User model, we just store `passwordHash`. A better model would have a `salt` field.
    // To proceed with current User model: `passwordHash` will store "salt_base64_encoded + '$' + hash_hex_encoded".
    std::string combinedPasswordHash = CryptoUtil::urlSafeBase64Encode(salt) + "$" + passwordHash;


    auto user = userRepo.createUser(username, email, combinedPasswordHash);
    if (!user) {
        throw DatabaseException("Failed to create user.");
    }

    std::string token = JwtManager::getInstance().generateToken(user->id, user->username);
    Logger::info("UserService", "User registered successfully: {}", username);
    return {user, token};
}

std::string UserService::loginUser(const std::string& username, const std::string& password) {
    auto user = userRepo.findByUsername(username);
    if (!user) {
        throw UnauthorizedException("Invalid username or password.");
    }

    // Extract salt and hash from stored passwordHash
    size_t delimiterPos = user->passwordHash.find('$');
    if (delimiterPos == std::string::npos) {
        Logger::error("UserService", "Invalid password hash format for user {}. Likely missing salt.", username);
        throw UnauthorizedException("Invalid username or password.");
    }
    std::string storedSaltB64 = user->passwordHash.substr(0, delimiterPos);
    std::string storedHash = user->passwordHash.substr(delimiterPos + 1);

    std::string storedSalt = CryptoUtil::urlSafeBase64Decode(storedSaltB64);

    if (!CryptoUtil::verifyPassword(password, storedSalt, storedHash)) {
        throw UnauthorizedException("Invalid username or password.");
    }

    std::string token = JwtManager::getInstance().generateToken(user->id, user->username);
    Logger::info("UserService", "User logged in successfully: {}", username);
    return token;
}

std::optional<User> UserService::getUserById(const std::string& id) {
    return userRepo.findById(id);
}
```