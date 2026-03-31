#include "UserService.h"
#include "middleware/ErrorHandler.h" // For custom exceptions
#include <spdlog/spdlog.h>

namespace services {

UserService::UserService(std::shared_ptr<repositories::UserRepository> userRepo)
    : userRepo_(std::move(userRepo)) {
    if (!userRepo_) {
        spdlog::critical("UserService initialized with null UserRepository!");
        throw std::runtime_error("UserRepository is not initialized.");
    }
}

std::optional<models::User> UserService::getUserById(long long userId) {
    return userRepo_->findById(userId);
}

std::vector<models::User> UserService::getAllUsers() {
    return userRepo_->findAll();
}

bool UserService::updateUser(long long userId, const std::string& newUsername, const std::string& newEmail, const std::string& newRole) {
    auto existingUser = userRepo_->findById(userId);
    if (!existingUser) {
        throw NotFoundError("User not found.");
    }

    // Basic validation
    if (newUsername.empty() || newEmail.empty() || newRole.empty()) {
        throw BadRequestError("Username, email, and role cannot be empty for update.");
    }

    // Check for username/email conflict if they are changing
    if (existingUser->username != newUsername) {
        if (userRepo_->findByUsername(newUsername)) {
            throw ConflictError("Username already taken by another user.");
        }
    }
    if (existingUser->email != newEmail) {
        if (userRepo_->findByEmail(newEmail)) {
            throw ConflictError("Email already registered by another user.");
        }
    }

    existingUser->username = newUsername;
    existingUser->email = newEmail;
    existingUser->role = newRole; // Careful with role updates, typically more strict business logic

    try {
        bool updated = userRepo_->update(*existingUser);
        if (updated) {
            spdlog::info("User ID {} updated.", userId);
        } else {
            spdlog::warn("User ID {} update failed (no rows affected).", userId);
        }
        return updated;
    } catch (const ApiError& e) {
        throw; // Re-throw specific API errors (e.g., ConflictError from repo)
    } catch (const std::exception& e) {
        spdlog::error("Error updating user {}: {}", userId, e.what());
        throw InternalServerError("Failed to update user due to a server error.");
    }
}

bool UserService::deleteUser(long long userId) {
    try {
        bool deleted = userRepo_->remove(userId);
        if (deleted) {
            spdlog::info("User ID {} deleted.", userId);
        } else {
            spdlog::warn("User ID {} deletion failed (not found or no rows affected).", userId);
        }
        return deleted;
    } catch (const ApiError& e) {
        throw;
    } catch (const std::exception& e) {
        spdlog::error("Error deleting user {}: {}", userId, e.what());
        throw InternalServerError("Failed to delete user due to a server error.");
    }
}

} // namespace services