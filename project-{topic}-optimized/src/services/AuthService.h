```cpp
#pragma once

#include <string>
#include <optional>
#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include "../models/User.h"

// For JWT
#include <jwt-cpp/jwt.h>

class AuthService {
public:
    AuthService(drogon::orm::DbClientPtr dbClient);

    // Register a new user
    drogon::Task<std::pair<User, std::string>> registerUser(const std::string& username, const std::string& email, const std::string& password);

    // Authenticate user and generate JWT
    drogon::Task<std::optional<std::string>> loginUser(const std::string& email, const std::string& password);

    // Find user by email
    drogon::Task<std::optional<User>> findUserByEmail(const std::string& email);

    // Find user by ID
    drogon::Task<std::optional<User>> findUserById(int user_id);

    // Verify JWT token and get user ID
    std::optional<int> verifyToken(const std::string& token);

    // Generate JWT token for a user ID
    std::string generateToken(int user_id);

private:
    drogon::orm::DbClientPtr dbClient_;
    std::string jwtSecret_;

    // Helper to hash password
    std::string hashPassword(const std::string& password);
    // Helper to verify password
    bool verifyPassword(const std::string& password, const std::string& hashedPassword);

    // Get current timestamp in YYYY-MM-DD HH:MM:SS format
    std::string getCurrentTimestamp();
};
```