#include "UserRepository.h"
#include <drogon/orm/Exception.h>
#include <spdlog/spdlog.h>

namespace repositories {

UserRepository::UserRepository(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {
    if (!dbClient_) {
        spdlog::critical("UserRepository initialized with null DbClientPtr!");
        throw std::runtime_error("Database client is not initialized.");
    }
}

std::optional<models::User> UserRepository::findById(long long id) {
    std::string sql = "SELECT id, username, email, password_hash, password_salt, role, created_at, updated_at FROM users WHERE id = $1";
    try {
        auto result = dbClient_->execSqlSync(sql, id);
        if (!result.empty()) {
            const auto& row = result[0];
            models::User user;
            user.id = row["id"].as<long long>();
            user.username = row["username"].as<std::string>();
            user.email = row["email"].as<std::string>();
            user.passwordHash = row["password_hash"].as<std::string>();
            user.passwordSalt = row["password_salt"].as<std::string>();
            user.role = row["role"].as<std::string>();
            user.createdAt = row["created_at"].as<std::string>();
            user.updatedAt = row["updated_at"].as<std::string>();
            return user;
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findById (User): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findById (User): {}", e.what());
    }
    return std::nullopt;
}

std::optional<models::User> UserRepository::findByUsername(const std::string& username) {
    std::string sql = "SELECT id, username, email, password_hash, password_salt, role, created_at, updated_at FROM users WHERE username = $1";
    try {
        auto result = dbClient_->execSqlSync(sql, username);
        if (!result.empty()) {
            const auto& row = result[0];
            models::User user;
            user.id = row["id"].as<long long>();
            user.username = row["username"].as<std::string>();
            user.email = row["email"].as<std::string>();
            user.passwordHash = row["password_hash"].as<std::string>();
            user.passwordSalt = row["password_salt"].as<std::string>();
            user.role = row["role"].as<std::string>();
            user.createdAt = row["created_at"].as<std::string>();
            user.updatedAt = row["updated_at"].as<std::string>();
            return user;
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findByUsername (User): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findByUsername (User): {}", e.what());
    }
    return std::nullopt;
}

std::optional<models::User> UserRepository::findByEmail(const std::string& email) {
    std::string sql = "SELECT id, username, email, password_hash, password_salt, role, created_at, updated_at FROM users WHERE email = $1";
    try {
        auto result = dbClient_->execSqlSync(sql, email);
        if (!result.empty()) {
            const auto& row = result[0];
            models::User user;
            user.id = row["id"].as<long long>();
            user.username = row["username"].as<std::string>();
            user.email = row["email"].as<std::string>();
            user.passwordHash = row["password_hash"].as<std::string>();
            user.passwordSalt = row["password_salt"].as<std::string>();
            user.role = row["role"].as<std::string>();
            user.createdAt = row["created_at"].as<std::string>();
            user.updatedAt = row["updated_at"].as<std::string>();
            return user;
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findByEmail (User): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findByEmail (User): {}", e.what());
    }
    return std::nullopt;
}


std::vector<models::User> UserRepository::findAll() {
    std::vector<models::User> users;
    std::string sql = "SELECT id, username, email, password_hash, password_salt, role, created_at, updated_at FROM users ORDER BY id";
    try {
        auto result = dbClient_->execSqlSync(sql);
        for (const auto& row : result) {
            models::User user;
            user.id = row["id"].as<long long>();
            user.username = row["username"].as<std::string>();
            user.email = row["email"].as<std::string>();
            user.passwordHash = row["password_hash"].as<std::string>();
            user.passwordSalt = row["password_salt"].as<std::string>();
            user.role = row["role"].as<std::string>();
            user.createdAt = row["created_at"].as<std::string>();
            user.updatedAt = row["updated_at"].as<std::string>();
            users.push_back(user);
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in findAll (User): {}", e.what());
    } catch (const std::exception& e) {
        spdlog::error("Error in findAll (User): {}", e.what());
    }
    return users;
}

long long UserRepository::create(const models::User& user) {
    std::string sql = "INSERT INTO users (username, email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    try {
        auto result = dbClient_->execSqlSync(sql,
                                             user.username,
                                             user.email,
                                             user.passwordHash,
                                             user.passwordSalt,
                                             user.role);
        if (!result.empty()) {
            return result[0]["id"].as<long long>();
        }
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in create (User): {}", e.what());
        // Check for unique constraint violation
        if (std::string(e.what()).find("duplicate key value violates unique constraint") != std::string::npos) {
             throw ConflictError("User with this username or email already exists.");
        }
        throw; // Re-throw other DB exceptions
    } catch (const std::exception& e) {
        spdlog::error("Error in create (User): {}", e.what());
        throw;
    }
    return 0; // Should not reach here if returning ID
}

bool UserRepository::update(const models::User& user) {
    std::string sql = "UPDATE users SET username = $1, email = $2, password_hash = $3, password_salt = $4, role = $5, updated_at = NOW() WHERE id = $6";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql,
                                                 user.username,
                                                 user.email,
                                                 user.passwordHash,
                                                 user.passwordSalt,
                                                 user.role,
                                                 user.id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in update (User): {}", e.what());
        if (std::string(e.what()).find("duplicate key value violates unique constraint") != std::string::npos) {
             throw ConflictError("Another user with this username or email already exists.");
        }
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in update (User): {}", e.what());
        throw;
    }
}

bool UserRepository::remove(long long id) {
    std::string sql = "DELETE FROM users WHERE id = $1";
    try {
        size_t affectedRows = dbClient_->execSqlSync(sql, id).affectedRows();
        return affectedRows > 0;
    } catch (const drogon::orm::DrogonDbException& e) {
        spdlog::error("DB error in remove (User): {}", e.what());
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error in remove (User): {}", e.what());
        throw;
    }
}

} // namespace repositories