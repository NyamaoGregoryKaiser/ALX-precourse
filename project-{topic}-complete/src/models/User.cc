```cpp
#include "User.h"
#include <drogon/drogon.h> // For LOG_ERROR, LOG_DEBUG
#include <argon2.h> // Example for password hashing, might need a wrapper if not direct C++ library
#include <random>
#include <iomanip> // For std::hex, std::setw, std::setfill

// Dummy password hashing/verification for demonstration.
// In a real application, use a robust library like Argon2, bcrypt, or scrypt.
// For this example, we'll simulate a strong hash.
namespace {
    std::string generateSalt(size_t length = 16) {
        std::random_device rd;
        std::mt19937 generator(rd());
        std::uniform_int_distribution<> distrib(0, 255);
        std::stringstream ss;
        for (size_t i = 0; i < length; ++i) {
            ss << std::hex << std::setw(2) << std::setfill('0') << distrib(generator);
        }
        return ss.str();
    }

    std::string simpleHash(const std::string& password, const std::string& salt) {
        // This is a placeholder for a real hashing algorithm like Argon2 or BCrypt
        // DO NOT USE THIS IN PRODUCTION.
        return "hashed_" + salt + "_" + password + "_secure";
    }
}

namespace CMS::Models {

UserMapper::UserMapper(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {}

drogon::orm::Future<User> UserMapper::findById(long long id) {
    auto query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([=](const drogon::orm::Result& result) {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("User not found", 0);
        }
        const auto& row = result[0];
        return User{
            row["id"].as<long long>(),
            row["username"].as<std::string>(),
            row["email"].as<std::string>(),
            row["password_hash"].as<std::string>(),
            row["role"].as<std::string>(),
            row["created_at"].as<std::string>(),
            row["updated_at"].as<std::string>()
        };
    });
}

drogon::orm::Future<User> UserMapper::findByEmail(const std::string& email) {
    auto query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1";
    return dbClient_->execSqlAsync(query, email).then([=](const drogon::orm::Result& result) {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("User not found by email", 0);
        }
        const auto& row = result[0];
        return User{
            row["id"].as<long long>(),
            row["username"].as<std::string>(),
            row["email"].as<std::string>(),
            row["password_hash"].as<std::string>(),
            row["role"].as<std::string>(),
            row["created_at"].as<std::string>(),
            row["updated_at"].as<std::string>()
        };
    });
}

drogon::orm::Future<User> UserMapper::findByUsername(const std::string& username) {
    auto query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE username = $1";
    return dbClient_->execSqlAsync(query, username).then([=](const drogon::orm::Result& result) {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("User not found by username", 0);
        }
        const auto& row = result[0];
        return User{
            row["id"].as<long long>(),
            row["username"].as<std::string>(),
            row["email"].as<std::string>(),
            row["password_hash"].as<std::string>(),
            row["role"].as<std::string>(),
            row["created_at"].as<std::string>(),
            row["updated_at"].as<std::string>()
        };
    });
}

drogon::orm::Future<std::vector<User>> UserMapper::findAll() {
    auto query = "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users ORDER BY created_at DESC";
    return dbClient_->execSqlAsync(query).then([=](const drogon::orm::Result& result) {
        std::vector<User> users;
        for (const auto& row : result) {
            users.push_back(User{
                row["id"].as<long long>(),
                row["username"].as<std::string>(),
                row["email"].as<std::string>(),
                row["password_hash"].as<std::string>(),
                row["role"].as<std::string>(),
                row["created_at"].as<std::string>(),
                row["updated_at"].as<std::string>()
            });
        }
        return users;
    });
}

drogon::orm::Future<User> UserMapper::create(const User& user) {
    auto query = "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at";
    return dbClient_->execSqlAsync(query,
                                   user.username,
                                   user.email,
                                   user.password_hash,
                                   user.role).then([user](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Failed to create user", 0);
        }
        const auto& row = result[0];
        user.id = row["id"].as<long long>();
        user.created_at = row["created_at"].as<std::string>();
        user.updated_at = row["updated_at"].as<std::string>();
        return user;
    });
}

drogon::orm::Future<User> UserMapper::update(const User& user) {
    auto query = "UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4, updated_at = NOW() WHERE id = $5 RETURNING updated_at";
    return dbClient_->execSqlAsync(query,
                                   user.username,
                                   user.email,
                                   user.password_hash,
                                   user.role,
                                   user.id).then([user](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("User not found for update", 0);
        }
        const auto& row = result[0];
        user.updated_at = row["updated_at"].as<std::string>();
        return user;
    });
}

drogon::orm::Future<void> UserMapper::remove(long long id) {
    auto query = "DELETE FROM users WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([](const drogon::orm::Result& result) {
        if (result.affectedRows() == 0) {
            throw drogon::orm::UnexpectedRows("User not found for deletion", 0);
        }
    });
}

std::string UserMapper::hashPassword(const std::string& password) {
    std::string salt = generateSalt();
    return simpleHash(password, salt); // Replace with Argon2 or bcrypt
}

bool UserMapper::verifyPassword(const std::string& password, const std::string& hashedPassword) {
    // This is a placeholder for real verification.
    // Extract salt from hashedPassword and rehash `password` with it, then compare.
    // DO NOT USE THIS IN PRODUCTION.
    if (hashedPassword.length() < 10) return false; // Minimum length for "hashed_salt_"
    size_t salt_start = hashedPassword.find("hashed_") + 7;
    size_t salt_end = hashedPassword.find("_", salt_start);
    if (salt_start == std::string::npos || salt_end == std::string::npos) return false;
    std::string salt = hashedPassword.substr(salt_start, salt_end - salt_start);
    return simpleHash(password, salt) == hashedPassword; // For demonstration only
}

} // namespace CMS::Models
```