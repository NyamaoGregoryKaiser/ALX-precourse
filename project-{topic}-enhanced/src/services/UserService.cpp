```cpp
#include "UserService.hpp"
#include "../logger/Logger.hpp"
#include "../models/User.hpp"
#include "../database/Database.hpp" // For SQLiteException

#include <stdexcept>
#include <string>
#include <vector>
#include <optional>

UserService::UserService(Database& db) : db(db) {}

// Creates a new user in the database.
int UserService::createUser(User& user) {
    // Basic validation
    if (user.getUsername().empty() || user.getPasswordHash().empty() || user.getEmail().empty()) {
        throw std::runtime_error("Username, password hash, and email cannot be empty.");
    }
    // More complex validation (e.g., username/email uniqueness, password strength)
    // should happen in AuthService before calling this.

    try {
        int newUserId = User::create(db, user);
        user.setId(newUserId); // Update the user object with the new ID
        Logger::info("UserService: Created user '{}'. ID: {}", user.getUsername(), newUserId);
        return newUserId;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error creating user: {}", e.what());
        throw std::runtime_error("Database error while creating user.");
    }
}

// Retrieves a user by their ID.
std::optional<User> UserService::findById(int userId) {
    try {
        std::optional<User> user = User::findById(db, userId);
        if (user) {
            Logger::debug("UserService: Retrieved user with ID {}.", userId);
        } else {
            Logger::debug("UserService: User with ID {} not found.", userId);
        }
        return user;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error retrieving user by ID {}: {}", userId, e.what());
        throw std::runtime_error("Database error while retrieving user.");
    }
}

// Retrieves a user by their username.
std::optional<User> UserService::findByUsername(const std::string& username) {
    try {
        std::optional<User> user = User::findByUsername(db, username);
        if (user) {
            Logger::debug("UserService: Retrieved user with username '{}'.", username);
        } else {
            Logger::debug("UserService: User with username '{}' not found.", username);
        }
        return user;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error retrieving user by username '{}': {}", username, e.what());
        throw std::runtime_error("Database error while retrieving user.");
    }
}

// Retrieves a user by their email.
std::optional<User> UserService::findByEmail(const std::string& email) {
    try {
        std::optional<User> user = User::findByEmail(db, email);
        if (user) {
            Logger::debug("UserService: Retrieved user with email '{}'.", email);
        } else {
            Logger::debug("UserService: User with email '{}' not found.", email);
        }
        return user;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error retrieving user by email '{}': {}", email, e.what());
        throw std::runtime_error("Database error while retrieving user.");
    }
}

// Retrieves all users from the database.
std::vector<User> UserService::getAllUsers() {
    try {
        std::vector<User> users = User::findAll(db);
        Logger::debug("UserService: Retrieved all {} users.", users.size());
        return users;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error retrieving all users: {}", e.what());
        throw std::runtime_error("Database error while retrieving all users.");
    }
}

// Updates an existing user in the database.
bool UserService::updateUser(int userId, User& updatedUser) {
    // Ensure the ID of the updatedUser object matches the ID passed
    updatedUser.setId(userId);

    // Basic validation (e.g., username not empty)
    if (updatedUser.getUsername().empty() || updatedUser.getEmail().empty()) {
        throw std::runtime_error("Username and email cannot be empty for update.");
    }

    try {
        bool success = User::update(db, updatedUser);
        if (success) {
            Logger::info("UserService: Updated user with ID {}.", userId);
        } else {
            Logger::warn("UserService: User with ID {} not found for update.", userId);
            throw std::runtime_error("User not found for update.");
        }
        return success;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error updating user {}: {}", userId, e.what());
        throw std::runtime_error("Database error while updating user.");
    }
}

// Deletes a user by their ID.
bool UserService::deleteUser(int userId) {
    try {
        bool success = User::remove(db, userId);
        if (success) {
            Logger::info("UserService: Deleted user with ID {}.", userId);
        } else {
            Logger::warn("UserService: User with ID {} not found for deletion.", userId);
            throw std::runtime_error("User not found for deletion.");
        }
        return success;
    } catch (const SQLiteException& e) {
        Logger::error("UserService: SQLite error deleting user {}: {}", userId, e.what());
        throw std::runtime_error("Database error while deleting user.");
    }
}
```