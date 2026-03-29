```cpp
#include "UserService.hpp"
#include "../utils/PasswordUtils.hpp" // For PWDUtils::hashPassword

UserService::UserService(std::shared_ptr<DatabaseManager> db_manager)
    : db_manager_(db_manager) {}

std::optional<User> UserService::getUserById(int id) {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve user with ID: " + std::to_string(id));
    auto user = db_manager_->getUserById(id);
    if (!user.has_value()) {
        throw NotFoundException("User with ID " + std::to_string(id) + " not found.");
    }
    return user;
}

std::vector<User> UserService::getAllUsers() {
    Logger::log(LogLevel::DEBUG, "Attempting to retrieve all users.");
    return db_manager_->getAllUsers();
}

User UserService::updateUser(int id, const UserUpdateDTO& user_dto) {
    Logger::log(LogLevel::INFO, "Attempting to update user with ID: " + std::to_string(id));

    std::optional<User> existing_user_opt = db_manager_->getUserById(id);
    if (!existing_user_opt.has_value()) {
        throw NotFoundException("User with ID " + std::to_string(id) + " not found.");
    }

    User updated_user = existing_user_opt.value();

    if (user_dto.username.has_value()) {
        if (db_manager_->getUserByUsername(user_dto.username.value()).has_value() &&
            db_manager_->getUserByUsername(user_dto.username.value())->id.value() != id) {
            throw ConflictException("Username '" + user_dto.username.value() + "' already taken.");
        }
        updated_user.username = user_dto.username.value();
    }
    if (user_dto.email.has_value()) {
        if (db_manager_->getUserByEmail(user_dto.email.value()).has_value() &&
            db_manager_->getUserByEmail(user_dto.email.value())->id.value() != id) {
            throw ConflictException("Email '" + user_dto.email.value() + "' already taken.");
        }
        updated_user.email = user_dto.email.value();
    }
    if (user_dto.password.has_value()) {
        updated_user.password_hash = PWDUtils::hashPassword(user_dto.password.value());
    }
    if (user_dto.role.has_value()) {
        std::string role_str = user_dto.role.value();
        std::transform(role_str.begin(), role_str.end(), role_str.begin(), ::toupper);
        if (role_str == "ADMIN") {
            updated_user.role = UserRole::ADMIN;
        } else if (role_str == "USER") {
            updated_user.role = UserRole::USER;
        } else {
            throw BadRequestException("Invalid role specified: " + user_dto.role.value());
        }
    }

    try {
        db_manager_->updateUser(updated_user);
        Logger::log(LogLevel::INFO, "User with ID " + std::to_string(id) + " updated successfully.");
        return updated_user;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error updating user " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to update user due to database error.");
    }
}

bool UserService::deleteUser(int id) {
    Logger::log(LogLevel::INFO, "Attempting to delete user with ID: " + std::to_string(id));

    // Check if user exists before attempting to delete
    if (!db_manager_->getUserById(id).has_value()) {
        throw NotFoundException("User with ID " + std::to_string(id) + " not found.");
    }

    try {
        db_manager_->deleteUser(id);
        Logger::log(LogLevel::INFO, "User with ID " + std::to_string(id) + " deleted successfully.");
        return true;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error deleting user " + std::to_string(id) + ": " + std::string(e.what()));
        throw ServiceException("Failed to delete user due to database error.");
    }
}

User UserService::createUser(const UserRegisterDTO& register_dto, UserRole role) {
    Logger::log(LogLevel::INFO, "Attempting to create user: " + register_dto.username + " with role: " + userRoleToString(role));

    // Check if username or email already exists
    if (db_manager_->getUserByUsername(register_dto.username).has_value()) {
        throw ConflictException("Username '" + register_dto.username + "' already exists.");
    }
    if (db_manager_->getUserByEmail(register_dto.email).has_value()) {
        throw ConflictException("Email '" + register_dto.email + "' already exists.");
    }

    std::string hashed_password = PWDUtils::hashPassword(register_dto.password);
    User new_user(register_dto.username, register_dto.email, hashed_password, role);

    try {
        int new_user_id = db_manager_->createUser(new_user);
        new_user.id = new_user_id;
        Logger::log(LogLevel::INFO, "User " + new_user.username + " created successfully with ID " + std::to_string(new_user_id));
        return new_user;
    } catch (const DatabaseException& e) {
        Logger::log(LogLevel::ERROR, "Database error during user creation: " + std::string(e.what()));
        throw ServiceException("Failed to create user due to database error.");
    }
}
```