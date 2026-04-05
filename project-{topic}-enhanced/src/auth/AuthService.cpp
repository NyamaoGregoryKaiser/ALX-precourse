```cpp
#include "AuthService.hpp"
#include "../utils/CryptoUtils.hpp"
#include "../logger/Logger.hpp"
#include "../models/User.hpp"
#include "../database/Database.hpp" // For SQLiteException

#include <stdexcept>
#include <string>

AuthService::AuthService(Database& db, JwtManager& jwtManager)
    : db(db), jwtManager(jwtManager) {}

// Register a new user
User AuthService::registerUser(const std::string& username, const std::string& password, const std::string& email, const std::string& role) {
    // Input validation
    if (username.empty() || password.empty() || email.empty()) {
        Logger::warn("AuthService: Registration attempt with empty credentials.");
        throw std::runtime_error("Username, password, and email cannot be empty.");
    }
    if (password.length() < 8) { // Minimum password length
        Logger::warn("AuthService: Registration attempt with weak password for user: {}", username);
        throw std::runtime_error("Password must be at least 8 characters long.");
    }

    // Check if username or email already exists
    std::string query = "SELECT id FROM users WHERE username = ? OR email = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, username);
    stmt.bind(2, email);

    if (stmt.step()) {
        Logger::warn("AuthService: Registration failed. Username or email already exists for user: {}", username);
        throw std::runtime_error("Username or email already exists.");
    }
    stmt.finalize();

    // Hash the password
    std::string hashedPassword = CryptoUtils::hashPassword(password);

    // Create new user in the database
    query = "INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?);";
    stmt = db.prepare(query);
    stmt.bind(1, username);
    stmt.bind(2, hashedPassword);
    stmt.bind(3, email);
    stmt.bind(4, role);

    if (stmt.execute()) {
        int userId = db.getLastInsertRowId();
        Logger::info("AuthService: User registered successfully: {}. ID: {}", username, userId);
        return User(userId, username, hashedPassword, email, role);
    } else {
        Logger::error("AuthService: Failed to insert user {} into database.", username);
        throw std::runtime_error("Failed to register user.");
    }
}

// Authenticate user and generate JWT
std::string AuthService::loginUser(const std::string& username, const std::string& password, int& userId, std::string& userRole) {
    if (username.empty() || password.empty()) {
        Logger::warn("AuthService: Login attempt with empty credentials for user: {}", username);
        throw std::runtime_error("Username and password cannot be empty.");
    }

    // Retrieve user by username
    std::string query = "SELECT id, password_hash, role FROM users WHERE username = ?;";
    auto stmt = db.prepare(query);
    stmt.bind(1, username);

    if (stmt.step()) {
        // User found, verify password
        userId = stmt.getInt(0);
        std::string storedPasswordHash = stmt.getString(1);
        userRole = stmt.getString(2);
        stmt.finalize();

        if (CryptoUtils::verifyPassword(password, storedPasswordHash)) {
            // Password correct, generate JWT
            Logger::info("AuthService: User {} logged in successfully. ID: {}", username, userId);
            return jwtManager.createToken(userId, userRole);
        } else {
            Logger::warn("AuthService: Failed login attempt for user {}: Incorrect password.", username);
            throw std::runtime_error("Invalid credentials.");
        }
    } else {
        // User not found
        stmt.finalize();
        Logger::warn("AuthService: Failed login attempt for user {}: User not found.", username);
        throw std::runtime_error("Invalid credentials.");
    }
}

// Validate JWT (delegates to JwtManager)
bool AuthService::validateToken(const std::string& token) {
    return jwtManager.verifyToken(token);
}
```