```cpp
#include "UserController.hpp"
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp"
#include "../middleware/AuthMiddleware.hpp" // To access user claims from request
#include "../utils/CryptoUtils.hpp" // For hashing new passwords

#include "crow.h"
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <vector>

UserController::UserController(UserService& userService)
    : userService(userService) {}

// Helper to get authenticated user ID and role
std::pair<int, std::string> getAuthenticatedUserClaims(const crow::request& req) {
    int userId = req.get_context<AuthMiddleware::Context>().user_id;
    std::string userRole = req.get_context<AuthMiddleware::Context>().user_role;
    return {userId, userRole};
}

crow::response UserController::getAuthenticatedUser(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        std::optional<User> userOpt = userService.findById(userId);
        if (!userOpt) {
            // This should ideally not happen if AuthMiddleware successfully verified a user ID
            Logger::error("UserController: Authenticated user {} not found in database.", userId);
            throw NotFoundException("Authenticated user not found.");
        }

        Logger::info("UserController: User {} retrieved their own profile.", userId);
        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["user"] = userOpt.value().toJson();
        // Remove sensitive fields like password_hash before sending
        resBody["user"].erase("password_hash");
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        // Catch exceptions from service layer and re-throw as AppExceptions
        throw InternalServerErrorException(e.what());
    }
}

crow::response UserController::updateAuthenticatedUser(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);
        nlohmann::json reqBody = nlohmann::json::parse(req.body);

        std::optional<User> existingUserOpt = userService.findById(userId);
        if (!existingUserOpt) {
            Logger::error("UserController: Authenticated user {} not found for update (DB inconsistency).", userId);
            throw NotFoundException("Authenticated user not found.");
        }
        User existingUser = existingUserOpt.value();

        bool updated = false;
        if (reqBody.contains("email")) {
            std::string newEmail = reqBody["email"].get<std::string>();
            if (!newEmail.empty() && newEmail != existingUser.getEmail()) {
                // Basic email format check (more robust needed for prod)
                if (newEmail.find('@') == std::string::npos) {
                    throw BadRequestException("Invalid email format.");
                }
                // Check if new email already exists for another user
                std::optional<User> userWithNewEmail = userService.findByEmail(newEmail);
                if (userWithNewEmail && userWithNewEmail->getId() != userId) {
                    throw ConflictException("Email already taken by another user.");
                }
                existingUser.setEmail(newEmail);
                updated = true;
            }
        }
        if (reqBody.contains("password")) {
            std::string newPassword = reqBody["password"].get<std::string>();
            if (newPassword.length() < 8) {
                throw BadRequestException("New password must be at least 8 characters long.");
            }
            std::string newHashedPassword = CryptoUtils::hashPassword(newPassword);
            existingUser.setPasswordHash(newHashedPassword);
            updated = true;
        }
        // Username and role cannot be changed by user themselves, only by admin for role.

        if (updated) {
            userService.updateUser(userId, existingUser);
            Logger::info("UserController: User {} updated their profile.", userId);
        } else {
            Logger::info("UserController: User {} made update request with no changes.", userId);
        }

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = updated ? "User profile updated successfully" : "No changes applied.";
        return crow::response(200, resBody.dump());

    } catch (const nlohmann::json::parse_error& e) {
        throw BadRequestException("Invalid JSON in request body.");
    } catch (const std::runtime_error& e) {
        throw BadRequestException(e.what());
    }
}

crow::response UserController::deleteAuthenticatedUser(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        userService.deleteUser(userId);
        Logger::info("UserController: User {} deleted their account.", userId);

        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["message"] = "User account deleted successfully";
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        throw InternalServerErrorException(e.what());
    }
}

crow::response UserController::getAllUsers(const crow::request& req) {
    try {
        auto [userId, userRole] = getAuthenticatedUserClaims(req);

        // Authorization check: Only admin can view all users
        if (userRole != "admin") {
            Logger::warn("UserController: User {} (role: {}) attempted to access all users list.", userId, userRole);
            throw ForbiddenException("You are not authorized to view all users.");
        }

        std::vector<User> users = userService.getAllUsers();
        nlohmann::json userArray = nlohmann::json::array();
        for (const auto& user : users) {
            nlohmann::json userJson = user.toJson();
            userJson.erase("password_hash"); // Remove sensitive information
            userArray.push_back(userJson);
        }

        Logger::info("UserController: Admin user {} fetched all users.", userId);
        nlohmann::json resBody;
        resBody["status"] = "success";
        resBody["users"] = userArray;
        return crow::response(200, resBody.dump());

    } catch (const std::runtime_error& e) {
        throw InternalServerErrorException(e.what());
    }
}
```