```cpp
#include "UserService.h"
#include "db/Database.h"
#include "utils/PasswordHasher.h"
#include "utils/Logger.h"
#include <stdexcept>

User UserService::registerUser(const User& newUser, const std::string& plainPassword) {
    if (newUser.username.empty() || newUser.email.empty() || plainPassword.empty()) {
        throw std::runtime_error("Username, email, and password cannot be empty.");
    }

    // Check for existing username or email
    if (getUserByUsername(newUser.username).has_value()) {
        throw std::runtime_error("Username already taken.");
    }
    if (getUserByEmail(newUser.email).has_value()) {
        throw std::runtime_error("Email already registered.");
    }

    std::string passwordHash = PasswordHasher::hashPassword(plainPassword);

    std::string sql = "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at, updated_at;";
    std::vector<std::string> params = {newUser.username, newUser.email, passwordHash};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            throw std::runtime_error("Failed to register user, no data returned.");
        }
        const pqxx::row& row = rows[0];
        User registeredUser;
        registeredUser.id = row["id"].as<long>();
        registeredUser.username = row["username"].as<std::string>();
        registeredUser.email = row["email"].as<std::string>();
        registeredUser.created_at = row["created_at"].as<std::string>();
        registeredUser.updated_at = row["updated_at"].as<std::string>();
        LOG_INFO("User registered: ID={}, Username='{}'", registeredUser.id, registeredUser.username);
        return registeredUser;
    } catch (const DbException& e) {
        LOG_ERROR("Database error during user registration: {}", e.what());
        throw std::runtime_error("Database error during registration.");
    }
}

std::optional<User> UserService::authenticateUser(const std::string& username, const std::string& plainPassword) {
    if (username.empty() || plainPassword.empty()) {
        return std::nullopt;
    }

    std::optional<User> user = getUserByUsername(username);
    if (!user.has_value()) {
        LOG_WARN("Authentication failed: User '{}' not found.", username);
        return std::nullopt;
    }

    // Compare plain password with stored hash
    if (PasswordHasher::verifyPassword(plainPassword, user->password_hash)) {
        LOG_INFO("User '{}' authenticated successfully.", username);
        return user;
    } else {
        LOG_WARN("Authentication failed: Incorrect password for user '{}'.", username);
        return std::nullopt;
    }
}

std::optional<User> UserService::getUserById(long userId) {
    std::string sql = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1;";
    std::vector<std::string> params = {std::to_string(userId)};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        const pqxx::row& row = rows[0];
        User user;
        user.id = row["id"].as<long>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>(); // Password hash is needed internally
        user.created_at = row["created_at"].as<std::string>();
        user.updated_at = row["updated_at"].as<std::string>();
        return user;
    } catch (const DbException& e) {
        LOG_ERROR("Database error getting user by ID {}: {}", userId, e.what());
        throw std::runtime_error("Database error retrieving user.");
    }
}

std::optional<User> UserService::getUserByUsername(const std::string& username) {
    std::string sql = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1;";
    std::vector<std::string> params = {username};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        const pqxx::row& row = rows[0];
        User user;
        user.id = row["id"].as<long>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>();
        user.created_at = row["created_at"].as<std::string>();
        user.updated_at = row["updated_at"].as<std::string>();
        return user;
    } catch (const DbException& e) {
        LOG_ERROR("Database error getting user by username '{}': {}", username, e.what());
        throw std::runtime_error("Database error retrieving user.");
    }
}

std::optional<User> UserService::getUserByEmail(const std::string& email) {
    std::string sql = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1;";
    std::vector<std::string> params = {email};

    try {
        std::vector<pqxx::row> rows = Database::executeQuery(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        const pqxx::row& row = rows[0];
        User user;
        user.id = row["id"].as<long>();
        user.username = row["username"].as<std::string>();
        user.email = row["email"].as<std::string>();
        user.password_hash = row["password_hash"].as<std::string>();
        user.created_at = row["created_at"].as<std::string>();
        user.updated_at = row["updated_at"].as<std::string>();
        return user;
    } catch (const DbException& e) {
        LOG_ERROR("Database error getting user by email '{}': {}", email, e.what());
        throw std::runtime_error("Database error retrieving user.");
    }
}
```