```cpp
#include "AuthController.hpp"
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp"

#include "crow.h"
#include <nlohmann/json.hpp>
#include <stdexcept>

AuthController::AuthController(AuthService& authService, UserService& userService)
    : authService(authService), userService(userService) {}

// Handles user registration requests.
crow::response AuthController::registerUser(const crow::request& req) {
    try {
        nlohmann::json reqBody = nlohmann::json::parse(req.body);

        // Input validation
        if (!reqBody.contains("username") || !reqBody.contains("password") || !reqBody.contains("email")) {
            Logger::warn("AuthController: Missing fields for user registration.");
            throw BadRequestException("Missing username, password, or email.");
        }

        std::string username = reqBody["username"].get<std::string>();
        std::string password = reqBody["password"].get<std::string>();
        std::string email = reqBody["email"].get<std::string>();

        // Basic sanity checks
        if (username.empty() || password.empty() || email.empty()) {
            Logger::warn("AuthController: Empty fields provided for user registration.");
            throw BadRequestException("Username, password, and email cannot be empty.");
        }
        if (password.length() < 8) {
            Logger::warn("AuthController: Password too short for user registration: {}", username);
            throw BadRequestException("Password must be at least 8 characters long.");
        }
        // More robust email validation could be done here (regex)

        User newUser = authService.registerUser(username, password, email);
        Logger::info("AuthController: User '{}' registered successfully.", newUser.getUsername());

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "User registered successfully";
        resBody["user_id"] = newUser.getId();
        return crow::response(201, resBody.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("AuthController: JSON parse error in registerUser: {}", e.what());
        throw BadRequestException("Invalid JSON in request body.");
    } catch (const std::runtime_error& e) {
        // Catch specific AuthService errors and map to appropriate HTTP status
        std::string errMsg = e.what();
        if (errMsg.find("already exists") != std::string::npos) {
            Logger::warn("AuthController: Conflict during registration: {}", errMsg);
            throw ConflictException(errMsg);
        }
        Logger::warn("AuthController: Bad request during registration: {}", errMsg);
        throw BadRequestException(errMsg);
    }
}

// Handles user login requests.
crow::response AuthController::loginUser(const crow::request& req) {
    try {
        nlohmann::json reqBody = nlohmann::json::parse(req.body);

        // Input validation
        if (!reqBody.contains("username") || !reqBody.contains("password")) {
            Logger::warn("AuthController: Missing fields for user login.");
            throw BadRequestException("Missing username or password.");
        }

        std::string username = reqBody["username"].get<std::string>();
        std::string password = reqBody["password"].get<std::string>();

        if (username.empty() || password.empty()) {
            Logger::warn("AuthController: Empty fields provided for user login.");
            throw BadRequestException("Username and password cannot be empty.");
        }

        int userId;
        std::string userRole;
        std::string token = authService.loginUser(username, password, userId, userRole);

        // Retrieve full user details to return in response
        std::optional<User> userOpt = userService.findById(userId);
        if (!userOpt) {
            Logger::error("AuthController: User {} not found after successful login (DB inconsistency).", userId);
            throw InternalServerErrorException("User data not found after successful login.");
        }
        User user = userOpt.value();

        Logger::info("AuthController: User '{}' logged in successfully. ID: {}", username, userId);

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "Login successful";
        resBody["token"] = token;
        resBody["user"] = {
            {"id", user.getId()},
            {"username", user.getUsername()},
            {"email", user.getEmail()},
            {"role", user.getRole()}
        };
        return crow::response(200, resBody.dump());

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("AuthController: JSON parse error in loginUser: {}", e.what());
        throw BadRequestException("Invalid JSON in request body.");
    } catch (const std::runtime_error& e) {
        // Catch specific AuthService errors and map to appropriate HTTP status
        std::string errMsg = e.what();
        if (errMsg.find("Invalid credentials") != std::string::npos) {
            Logger::warn("AuthController: Unauthorized login attempt: {}", errMsg);
            throw UnauthorizedException(errMsg);
        }
        Logger::warn("AuthController: Bad request during login: {}", errMsg);
        throw BadRequestException(errMsg);
    }
}
```