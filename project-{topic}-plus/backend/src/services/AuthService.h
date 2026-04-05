```cpp
#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <drogon/utils/Utilities.h> // For bcrypt
#include <json/json.h>
#include <string>
#include <memory>
#include "models/User.h" // Drogon generated model
#include "utils/JwtHandler.h"
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief Service class for authentication related business logic.
 * Handles user registration, login, and JWT generation.
 */
class AuthService {
public:
    AuthService(drogon::orm::DbClientPtr dbClient)
        : _dbClient(dbClient), _userMapper(dbClient), _jwtHandler() {}

    /**
     * @brief Registers a new user.
     * @param username The desired username.
     * @param email The user's email.
     * @param password The user's plain text password.
     * @return User object of the newly registered user.
     * @throws ConflictException if username or email already exists.
     * @throws ValidationException if password is weak or input is invalid.
     * @throws InternalServerException on database errors.
     */
    User registerUser(const std::string& username, const std::string& email, const std::string& password) {
        if (username.empty() || email.empty() || password.empty()) {
            throw ValidationException("Username, email, and password cannot be empty.");
        }
        if (password.length() < 6) { // Basic password strength check
            throw ValidationException("Password must be at least 6 characters long.");
        }

        try {
            // Check for existing username or email
            auto users = _userMapper.findBy(
                drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, username) ||
                drogon::orm::Criteria("email", drogon::orm::CompareOperator::EQ, email)
            );

            for (const auto& user : users) {
                if (user.getUsername() == username) {
                    throw ConflictException("Username already exists.");
                }
                if (user.getEmail() == email) {
                    throw ConflictException("Email already exists.");
                }
            }

            // Hash password
            std::string passwordHash = drogon::utils::get >bcrypt(password, 10);

            // Create new user object
            User newUser(_dbClient);
            newUser.setUsername(username);
            newUser.setEmail(email);
            newUser.setPasswordHash(passwordHash);
            newUser.setRole("user"); // Default role

            // Save to database
            newUser.insert();
            LOG_INFO << "User registered: " << username;
            return newUser;

        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error during user registration: " << e.what();
            throw InternalServerException("Database error during registration.");
        } catch (const ConflictException& e) {
            throw; // Re-throw specific exception
        } catch (const ValidationException& e) {
            throw; // Re-throw specific exception
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error during user registration: " << e.what();
            throw InternalServerException("Failed to register user due to an unexpected error.");
        }
    }

    /**
     * @brief Authenticates a user and generates a JWT.
     * @param username The user's username.
     * @param password The user's plain text password.
     * @return A pair: User object and JWT token string.
     * @throws AuthException if authentication fails.
     * @throws InternalServerException on database errors.
     */
    std::pair<User, std::string> loginUser(const std::string& username, const std::string& password) {
        if (username.empty() || password.empty()) {
            throw ValidationException("Username and password cannot be empty.");
        }

        try {
            std::vector<User> users = _userMapper.findBy(
                drogon::orm::Criteria("username", drogon::orm::CompareOperator::EQ, username)
            );

            if (users.empty()) {
                throw AuthException("Invalid username or password.");
            }

            User user = users[0];

            // Verify password
            if (!drogon::utils::validateBcrypt(password, user.getPasswordHash())) {
                throw AuthException("Invalid username or password.");
            }

            // Generate JWT
            std::string token = _jwtHandler.createToken(user.getId(), user.getRole(), user.getUsername());
            LOG_INFO << "User logged in: " << username;
            return {user, token};

        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error during user login: " << e.what();
            throw InternalServerException("Database error during login.");
        } catch (const AuthException& e) {
            throw;
        } catch (const ValidationException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error during user login: " << e.what();
            throw InternalServerException("Failed to login user due to an unexpected error.");
        }
    }

private:
    drogon::orm::DbClientPtr _dbClient;
    drogon::orm::Mapper<User> _userMapper;
    JwtHandler _jwtHandler;
};

} // namespace TaskManager

#endif // AUTH_SERVICE_H
```