```cpp
#ifndef USER_SERVICE_H
#define USER_SERVICE_H

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <memory>
#include "models/User.h"
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief Service class for user related business logic.
 * Handles fetching user profiles.
 */
class UserService {
public:
    UserService(drogon::orm::DbClientPtr dbClient)
        : _dbClient(dbClient), _userMapper(dbClient) {}

    /**
     * @brief Finds a user by their ID.
     * @param userId The ID of the user.
     * @return User object.
     * @throws NotFoundException if user does not exist.
     * @throws InternalServerException on database errors.
     */
    User getUserById(int userId) {
        try {
            return _userMapper.findByPrimaryKey(userId);
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("User with ID " + std::to_string(userId) + " not found.");
            }
            LOG_ERROR << "Database error fetching user by ID: " << e.what();
            throw InternalServerException("Database error fetching user.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching user by ID: " << e.what();
            throw InternalServerException("Failed to fetch user due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves a list of all users.
     * @return A vector of User objects.
     * @throws InternalServerException on database errors.
     */
    std::vector<User> getAllUsers() {
        try {
            return _userMapper.findAll();
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error fetching all users: " << e.what();
            throw InternalServerException("Database error fetching users.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching all users: " << e.what();
            throw InternalServerException("Failed to fetch users due to an unexpected error.");
        }
    }

    /**
     * @brief Updates a user's profile (e.g., email, username).
     * @param userId The ID of the user to update.
     * @param username_opt Optional new username.
     * @param email_opt Optional new email.
     * @return The updated User object.
     * @throws NotFoundException if user does not exist.
     * @throws ConflictException if new username or email already exists.
     * @throws ValidationException if input is invalid.
     * @throws InternalServerException on database errors.
     */
    User updateUserProfile(int userId,
                         const std::optional<std::string>& username_opt,
                         const std::optional<std::string>& email_opt) {
        try {
            User user = _userMapper.findByPrimaryKey(userId);

            // Check for username conflict
            if (username_opt && *username_opt != user.getUsername()) {
                if (_userMapper.count(drogon::orm::Criteria("username", drogon::orm::EQ, *username_opt)) > 0) {
                    throw ConflictException("Username '" + *username_opt + "' already exists.");
                }
                user.setUsername(*username_opt);
            }

            // Check for email conflict
            if (email_opt && *email_opt != user.getEmail()) {
                if (_userMapper.count(drogon::orm::Criteria("email", drogon::orm::EQ, *email_opt)) > 0) {
                    throw ConflictException("Email '" + *email_opt + "' already exists.");
                }
                user.setEmail(*email_opt);
            }

            // Save changes
            user.update();
            LOG_INFO << "User ID " << userId << " profile updated.";
            return user;

        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("User with ID " + std::to_string(userId) + " not found.");
            }
            LOG_ERROR << "Database error updating user profile: " << e.what();
            throw InternalServerException("Database error updating user profile.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const ConflictException& e) {
            throw;
        } catch (const ValidationException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error updating user profile: " << e.what();
            throw InternalServerException("Failed to update user profile due to an unexpected error.");
        }
    }

    /**
     * @brief Deletes a user by their ID.
     * @param userId The ID of the user to delete.
     * @throws NotFoundException if user does not exist.
     * @throws InternalServerException on database errors.
     */
    void deleteUser(int userId) {
        try {
            auto rowsAffected = _userMapper.deleteBy(drogon::orm::Criteria("id", drogon::orm::EQ, userId));
            if (rowsAffected == 0) {
                throw NotFoundException("User with ID " + std::to_string(userId) + " not found.");
            }
            LOG_INFO << "User ID " << userId << " deleted.";
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error deleting user: " << e.what();
            throw InternalServerException("Database error deleting user.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error deleting user: " << e.what();
            throw InternalServerException("Failed to delete user due to an unexpected error.");
        }
    }

private:
    drogon::orm::DbClientPtr _dbClient;
    drogon::orm::Mapper<User> _userMapper;
};

} // namespace TaskManager

#endif // USER_SERVICE_H
```