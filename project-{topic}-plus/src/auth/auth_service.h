#pragma once

#include <string>
#include <optional>
#include <jwt-cpp/jwt.h> // For JWT generation/verification

#include "src/models/user.h"
#include "src/utils/logger.h"
#include "src/utils/exceptions.h"
#include "src/config/config.h"

// JWT Token Payload structure
struct JwtPayload {
    long user_id;
    std::string username;
    UserRole role;
};

class AuthService {
public:
    AuthService() = default;

    // Register a new user
    std::optional<User> register_user(const std::string& username, const std::string& password, UserRole role = UserRole::USER);

    // Authenticate a user and generate a JWT
    std::optional<std::string> login_user(const std::string& username, const std::string& password);

    // Verify a JWT token and extract payload
    std::optional<JwtPayload> verify_token(const std::string& token);

    // Hash a password (using a simple placeholder, replace with bcrypt in production)
    std::string hash_password(const std::string& password);

    // Verify a password against a hash
    bool verify_password(const std::string& password, const std::string& password_hash);

private:
    std::string generate_token(long user_id, const std::string& username, UserRole role);
};
```