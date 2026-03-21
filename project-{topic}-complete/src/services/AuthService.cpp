```cpp
#include "AuthService.h"

namespace PaymentProcessor {
namespace Services {

User AuthService::registerUser(const std::string& username, const std::string& password, const std::string& email, UserRole role) {
    LOG_INFO("Attempting to register user: {}", username);

    // 1. Validate input
    if (username.empty() || password.empty() || email.empty()) {
        LOG_WARN("Registration failed: Missing required fields for user {}", username);
        throw InvalidArgumentException("Username, password, and email cannot be empty.");
    }
    if (password.length() < 8) {
        LOG_WARN("Registration failed: Password too short for user {}", username);
        throw ValidationException("Password must be at least 8 characters long.");
    }
    // Basic email regex validation could be added here
    if (email.find('@') == std::string::npos) {
        LOG_WARN("Registration failed: Invalid email format for user {}", username);
        throw ValidationException("Invalid email format.");
    }


    // 2. Check if username or email already exists
    if (dbManager.findUserByUsername(username).has_value()) {
        LOG_WARN("Registration failed: Username '{}' already exists.", username);
        throw ValidationException("Username already taken.");
    }
    // A more robust check for email uniqueness might be needed, but for simplicity, we assume username is the primary unique identifier for login.

    // 3. Hash password
    std::string hashedPassword = Hasher::hashPassword(password);
    LOG_DEBUG("Password hashed for user: {}", username);

    // 4. Create user in DB
    User newUser(username, hashedPassword, email, role);
    long long newId = dbManager.createUser(newUser);
    if (newId == 0) {
        LOG_ERROR("Failed to create user {} in database, but no exception was thrown by dbManager. This shouldn't happen.", username);
        throw PaymentProcessorException("Failed to register user due to an unexpected database error.");
    }
    newUser.id = newId; // Assign the generated ID

    // Retrieve the user to get creation timestamps
    auto createdUser = dbManager.findUserById(newId);
    if (!createdUser) {
        LOG_ERROR("Failed to retrieve newly created user {} (ID: {}) from database.", username, newId);
        throw PaymentProcessorException("User created but could not be retrieved immediately.");
    }
    LOG_INFO("User {} (ID: {}) registered successfully.", username, newId);
    return *createdUser;
}

std::string AuthService::login(const std::string& username, const std::string& password) {
    LOG_INFO("Attempting login for user: {}", username);

    // 1. Find user by username
    auto user_opt = dbManager.findUserByUsername(username);
    if (!user_opt.has_value()) {
        LOG_WARN("Login failed: User '{}' not found.", username);
        throw UnauthorizedException("Invalid username or password.");
    }
    User user = user_opt.value();

    // 2. Verify password
    if (!Hasher::verifyPassword(password, user.passwordHash)) {
        LOG_WARN("Login failed: Incorrect password for user '{}'.", username);
        throw UnauthorizedException("Invalid username or password.");
    }

    // 3. Generate JWT token
    std::string token = JwtManager::generateToken(std::to_string(*user.id), nlohmann::json(user.role).get<std::string>(), std::chrono::hours(Config::AppConfig::getInstance().getJwtExpiryHours()));
    LOG_INFO("User '{}' (ID: {}) logged in successfully. Token generated.", username, *user.id);
    return token;
}

bool AuthService::validateToken(const std::string& token) {
    LOG_DEBUG("Validating token.");
    return JwtManager::verifyToken(token);
}

std::string AuthService::getUserIdFromToken(const std::string& token) {
    return JwtManager::getClaim(token, "user_id");
}

std::string AuthService::getUserRoleFromToken(const std::string& token) {
    return JwtManager::getClaim(token, "role");
}

} // namespace Services
} // namespace PaymentProcessor
```