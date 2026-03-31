#include "AuthService.h"
#include "utils/CryptoUtils.h"
#include "utils/JwtManager.h"
#include "middleware/ErrorHandler.h" // For custom exceptions
#include <spdlog/spdlog.h>
#include <regex> // For email validation

namespace services {

// Basic email validation regex
bool isValidEmail(const std::string& email) {
    const std::regex pattern(R"((\w+)(\.|\_)?(\w*)@(\w+)(\.(\w+))+)");
    return std::regex_match(email, pattern);
}

AuthService::AuthService(std::shared_ptr<repositories::UserRepository> userRepo)
    : userRepo_(std::move(userRepo)) {
    if (!userRepo_) {
        spdlog::critical("AuthService initialized with null UserRepository!");
        throw std::runtime_error("UserRepository is not initialized.");
    }
}

AuthResult AuthService::registerUser(const std::string& username, const std::string& email, const std::string& password) {
    AuthResult result;

    if (username.empty() || email.empty() || password.empty()) {
        throw BadRequestError("Username, email, and password cannot be empty.");
    }
    if (!isValidEmail(email)) {
        throw BadRequestError("Invalid email format.");
    }
    if (password.length() < 8) { // Example password policy
        throw BadRequestError("Password must be at least 8 characters long.");
    }

    // Check if username or email already exists
    if (userRepo_->findByUsername(username)) {
        throw ConflictError("Username already taken.");
    }
    if (userRepo_->findByEmail(email)) {
        throw ConflictError("Email already registered.");
    }

    std::string salt = CryptoUtils::generateSalt();
    std::string hashedPassword = CryptoUtils::generateHash(password, salt);

    models::User newUser;
    newUser.username = username;
    newUser.email = email;
    newUser.passwordHash = hashedPassword;
    newUser.passwordSalt = salt;
    newUser.role = "user"; // Default role

    try {
        long long userId = userRepo_->create(newUser);
        if (userId > 0) {
            newUser.id = userId;
            result.success = true;
            result.token = JwtManager::getInstance().generateToken(userId, newUser.username, newUser.role);
            result.message = "User registered successfully.";
            result.userId = userId;
            result.role = newUser.role;
            spdlog::info("User registered: {}", username);
        } else {
            result.message = "Failed to register user.";
            spdlog::error("Failed to create user in database: {}", username);
        }
    } catch (const ApiError& e) {
        throw; // Re-throw specific API errors
    } catch (const std::exception& e) {
        spdlog::error("Error during user registration for {}: {}", username, e.what());
        throw InternalServerError("Failed to register user due to a server error.");
    }
    return result;
}

AuthResult AuthService::loginUser(const std::string& usernameOrEmail, const std::string& password) {
    AuthResult result;

    if (usernameOrEmail.empty() || password.empty()) {
        throw BadRequestError("Username/Email and password cannot be empty.");
    }

    std::optional<models::User> user;
    if (usernameOrEmail.find('@') != std::string::npos) { // Appears to be an email
        user = userRepo_->findByEmail(usernameOrEmail);
    } else { // Assume it's a username
        user = userRepo_->findByUsername(usernameOrEmail);
    }

    if (!user) {
        throw UnauthorizedError("Invalid credentials.");
    }

    if (!CryptoUtils::verifyHash(password, user->passwordSalt, user->passwordHash)) {
        throw UnauthorizedError("Invalid credentials.");
    }

    result.success = true;
    result.token = JwtManager::getInstance().generateToken(user->id, user->username, user->role);
    result.message = "Login successful.";
    result.userId = user->id;
    result.role = user->role;
    spdlog::info("User logged in: {}", user->username);

    return result;
}

} // namespace services