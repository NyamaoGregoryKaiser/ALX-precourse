```cpp
#include "AuthService.hpp"
#include "../utils/PasswordUtils.hpp" // For PWDUtils::hashPassword and verifyPassword
#include <stdexcept>

AuthService::AuthService(std::shared_ptr<DatabaseManager> db_manager, JWTManager& jwt_manager)
    : db_manager_(db_manager), jwt_manager_(jwt_manager) {}

AuthResponseDTO AuthService::registerUser(const UserRegisterDTO& register_dto) {
    Logger::log(LogLevel::INFO, "Attempting to register user: " + register_dto.username);

    // Check if username or email already exists
    if (db_manager_->getUserByUsername(register_dto.username).has_value()) {
        throw ConflictException("Username '" + register_dto.username + "' already exists.");
    }
    if (db_manager_->getUserByEmail(register_dto.email).has_value()) {
        throw ConflictException("Email '" + register_dto.email + "' already exists.");
    }

    // Hash the password
    std::string hashed_password = PWDUtils::hashPassword(register_dto.password);

    // Create a new User object (default role is USER)
    User new_user(register_dto.username, register_dto.email, hashed_password, UserRole::USER);

    try {
        int new_user_id = db_manager_->createUser(new_user);
        new_user.id = new_user_id; // Set the ID returned by the database

        // Generate JWT token
        std::string token = jwt_manager_.generateToken(new_user_id, new_user.username, userRoleToString(new_user.role));

        Logger::log(LogLevel::INFO, "User " + new_user.username + " registered successfully with ID " + std::to_string(new_user_id));
        return AuthResponseDTO{token, new_user};

    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error during user registration: " + std::string(e.what()));
        throw ServiceException("Failed to register user due to database error.");
    }
}

AuthResponseDTO AuthService::loginUser(const UserLoginDTO& login_dto) {
    Logger::log(LogLevel::INFO, "Attempting to log in user: " + login_dto.username);

    // Retrieve user by username
    std::optional<User> user_opt = db_manager_->getUserByUsername(login_dto.username);

    if (!user_opt.has_value()) {
        throw UnauthorizedException("Invalid username or password.");
    }

    User user = user_opt.value();

    // Verify password
    if (!PWDUtils::verifyPassword(login_dto.password, user.password_hash)) {
        throw UnauthorizedException("Invalid username or password.");
    }

    // Generate JWT token
    std::string token = jwt_manager_.generateToken(user.id.value(), user.username, userRoleToString(user.role));

    Logger::log(LogLevel::INFO, "User " + user.username + " logged in successfully.");
    return AuthResponseDTO{token, user};
}
```