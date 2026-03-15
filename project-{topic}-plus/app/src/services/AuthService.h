#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <string>
#include <optional>
#include "../models/User.h"
#include "UserService.h"
#include "../utils/JWT.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"

class AuthService {
private:
    UserService& user_service;

public:
    AuthService(UserService& user_svc) : user_service(user_svc) {
        LOG_INFO("AuthService initialized.");
    }

    /**
     * @brief Registers a new user.
     * @param username The username for the new user.
     * @param email The email for the new user.
     * @param password The plain-text password.
     * @param role The role (e.g., "USER", "ADMIN").
     * @return The created User object and a JWT token.
     * @throws BadRequestException if input is invalid.
     * @throws ConflictException if user already exists.
     * @throws InternalServerException on other errors.
     */
    std::pair<User, std::string> registerUser(const std::string& username, const std::string& email,
                                              const std::string& password, const std::string& role) {
        try {
            User new_user = user_service.createUser(username, email, password, role);
            std::string token = JWT::generateToken(new_user.id, new_user.username, new_user.role);
            LOG_INFO("User {} registered successfully.", new_user.username);
            return {new_user, token};
        } catch (const AppException& e) {
            throw e; // Re-throw specific application exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user registration: {}", e.what());
            throw InternalServerException("Failed to register user.");
        }
    }

    /**
     * @brief Authenticates a user and returns a JWT token.
     * @param username The user's username.
     * @param password The user's plain-text password.
     * @return The authenticated User object and a JWT token.
     * @throws UnauthorizedException if credentials are invalid.
     * @throws InternalServerException on other errors.
     */
    std::pair<User, std::string> loginUser(const std::string& username, const std::string& password) {
        try {
            auto user_opt = user_service.findByUsername(username);
            if (!user_opt) {
                LOG_WARN("Login attempt failed for non-existent user: {}", username);
                throw UnauthorizedException("Invalid username or password.");
            }

            User user = user_opt.value();
            if (!verify_password(password, user.password_hash)) {
                LOG_WARN("Login attempt failed for user {}: invalid password.", username);
                throw UnauthorizedException("Invalid username or password.");
            }

            std::string token = JWT::generateToken(user.id, user.username, user.role);
            LOG_INFO("User {} logged in successfully.", user.username);
            return {user, token};
        } catch (const UnauthorizedException& e) {
            throw e; // Re-throw specific application exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user login for {}: {}", username, e.what());
            throw InternalServerException("Failed to log in.");
        }
    }

    // You could add a 'logout' function here, though JWTs are generally stateless
    // and logout typically involves client-side token deletion/invalidation in a blacklist.
};

#endif // AUTH_SERVICE_H