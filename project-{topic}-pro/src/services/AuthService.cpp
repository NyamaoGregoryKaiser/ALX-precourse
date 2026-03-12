```cpp
#include "services/AuthService.hpp"
#include "util/Logger.hpp"
#include "util/CryptoUtils.hpp"
#include "util/Config.hpp"
#include "exceptions/ApiException.hpp"
#include <chrono>

AuthService::AuthService(UserRepository& userRepository) : userRepository(userRepository) {}

User AuthService::registerUser(const std::string& username, const std::string& email, const std::string& password, UserRole role) {
    // Validate input
    if (username.empty() || email.empty() || password.empty()) {
        throw BadRequestException("Username, email, and password cannot be empty.");
    }
    // Basic email format check
    if (email.find('@') == std::string::npos || email.find('.') == std::string::npos) {
        throw BadRequestException("Invalid email format.");
    }

    // Check if username or email already exists
    if (userRepository.findByUsername(username).has_value()) {
        throw ConflictException("Username already taken.");
    }
    if (userRepository.findByEmail(email).has_value()) {
        throw ConflictException("Email already registered.");
    }

    // Hash password
    std::string hashedPassword = CryptoUtils::hashPassword(password);

    // Create user object
    User newUser;
    newUser.username = username;
    newUser.email = email;
    newUser.hashedPassword = hashedPassword;
    newUser.role = role;
    // createdAt and updatedAt will be set by the database

    // Save user to database
    try {
        User createdUser = userRepository.create(newUser);
        Logger::get()->info("New user registered: {}", username);
        return createdUser;
    } catch (const ApiException& e) {
        throw; // Re-throw specific API exceptions
    } catch (const std::exception& e) {
        Logger::get()->error("Failed to register user {}: {}", username, e.what());
        throw InternalServerErrorException("Failed to register user due to an internal error.");
    }
}

std::optional<std::string> AuthService::loginUser(const std::string& username, const std::string& password) {
    if (username.empty() || password.empty()) {
        throw BadRequestException("Username and password cannot be empty.");
    }

    // Find user by username
    std::optional<User> userOpt = userRepository.findByUsername(username);
    if (!userOpt.has_value()) {
        Logger::get()->warn("Login attempt for non-existent user: {}", username);
        throw UnauthorizedException("Invalid credentials.");
    }

    User user = userOpt.value();

    // Verify password
    if (!CryptoUtils::verifyPassword(password, user.hashedPassword)) {
        Logger::get()->warn("Failed login attempt for user: {} (incorrect password)", username);
        throw UnauthorizedException("Invalid credentials.");
    }

    // Generate JWT token
    long jwtExpiryMinutes = Config::getJwtExpiryMinutes();
    std::string token = CryptoUtils::generateJwtToken(user.id, user.username, user.role, jwtExpiryMinutes);

    Logger::get()->info("User {} logged in successfully.", username);
    return token;
}
```