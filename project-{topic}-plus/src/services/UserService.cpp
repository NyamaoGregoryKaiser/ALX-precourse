#include "UserService.h"
#include "../utils/BcryptWrapper.h"
#include "../logger/Logger.h"
#include <regex> // For email validation

UserService::UserService() : _user_dao() {}

bool UserService::isValidEmail(const std::string& email) {
    const std::regex email_regex(R"(([^@]+)@([^@]+)\.([^@]+))");
    return std::regex_match(email, email_regex);
}

bool UserService::isValidPassword(const std::string& password) {
    // Password policy: At least 8 characters, one uppercase, one lowercase, one number, one special character
    if (password.length() < 8) return false;
    bool has_upper = false, has_lower = false, has_digit = false, has_special = false;
    for (char c : password) {
        if (std::isupper(c)) has_upper = true;
        else if (std::islower(c)) has_lower = true;
        else if (std::isdigit(c)) has_digit = true;
        else if (std::ispunct(c)) has_special = true;
    }
    return has_upper && has_lower && has_digit && has_special;
}

std::optional<User> UserService::registerUser(const User& newUserTemplate, const std::string& rawPassword) {
    if (!isValidEmail(newUserTemplate.email)) {
        throw UserServiceException("Invalid email format.");
    }
    if (!isValidPassword(rawPassword)) {
        throw UserServiceException("Password does not meet complexity requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char).");
    }

    // Check if username or email already exists
    if (_user_dao.findUserByUsername(newUserTemplate.username) || _user_dao.findUserByEmail(newUserTemplate.email)) {
        throw UserAlreadyExistsException("User with this username or email already exists.");
    }

    // Hash the password
    std::string passwordHash = BcryptWrapper::hashPassword(rawPassword);
    User userToCreate = newUserTemplate;
    userToCreate.password_hash = passwordHash;

    try {
        return _user_dao.createUser(userToCreate);
    } catch (const DatabaseException& e) {
        // Re-throw if it's a specific "already exists" (though we checked above, defensive)
        if (std::string(e.what()).find("already exists") != std::string::npos) {
            throw UserAlreadyExistsException("User with this username or email already exists.");
        }
        Logger::get_logger()->error("Error registering user: {}", e.what());
        throw UserServiceException("Failed to register user due to a database error.");
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error registering user: {}", e.what());
        throw UserServiceException("An unexpected error occurred during user registration.");
    }
}

std::optional<User> UserService::authenticateUser(const std::string& username_or_email, const std::string& password) {
    std::optional<User> user;
    if (username_or_email.find('@') != std::string::npos) { // Looks like an email
        user = _user_dao.findUserByEmail(username_or_email);
    } else { // Assume username
        user = _user_dao.findUserByUsername(username_or_email);
    }

    if (!user) {
        throw InvalidCredentialsException("Invalid username/email or password.");
    }

    if (!BcryptWrapper::checkPassword(password, user->password_hash)) {
        throw InvalidCredentialsException("Invalid username/email or password.");
    }

    return user;
}

std::optional<User> UserService::getUserById(const std::string& id) {
    return _user_dao.findUserById(id);
}

std::vector<User> UserService::getAllUsers(int limit, int offset) {
    return _user_dao.findAllUsers(limit, offset);
}

std::optional<User> UserService::updateUser(const std::string& userId, const nlohmann::json& updateData) {
    std::optional<User> existingUser = _user_dao.findUserById(userId);
    if (!existingUser) {
        throw UserNotFoundException("User not found for update.");
    }

    // Apply updates from JSON
    if (updateData.contains("username")) existingUser->username = updateData["username"].get<std::string>();
    if (updateData.contains("email")) {
        std::string newEmail = updateData["email"].get<std::string>();
        if (!isValidEmail(newEmail)) {
            throw UserServiceException("Invalid email format for update.");
        }
        existingUser->email = newEmail;
    }
    if (updateData.contains("password")) {
        std::string newPassword = updateData["password"].get<std::string>();
        if (!isValidPassword(newPassword)) {
            throw UserServiceException("New password does not meet complexity requirements.");
        }
        existingUser->password_hash = BcryptWrapper::hashPassword(newPassword);
    }
    if (updateData.contains("first_name")) existingUser->first_name = updateData["first_name"].get<std::string>();
    if (updateData.contains("last_name")) {
        auto val = JsonUtils::getString(updateData, "last_name");
        if (val) existingUser->last_name = val;
        else existingUser->last_name = std::nullopt; // Allow setting to null
    }
    if (updateData.contains("phone_number")) {
        auto val = JsonUtils::getString(updateData, "phone_number");
        if (val) existingUser->phone_number = val;
        else existingUser->phone_number = std::nullopt;
    }
    if (updateData.contains("address")) {
        auto val = JsonUtils::getString(updateData, "address");
        if (val) existingUser->address = val;
        else existingUser->address = std::nullopt;
    }
    if (updateData.contains("role")) {
        std::string role_str = JsonUtils::getString(updateData, "role").value();
        existingUser->role = string_to_user_role(role_str);
    }

    existingUser->updated_at = std::chrono::system_clock::now(); // Update timestamp

    try {
        if (_user_dao.updateUser(*existingUser)) {
            return existingUser;
        }
        return std::nullopt;
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Error updating user {}: {}", userId, e.what());
        throw UserServiceException("Failed to update user due to a database error: " + std::string(e.what()));
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error updating user {}: {}", userId, e.what());
        throw UserServiceException("An unexpected error occurred during user update.");
    }
}

bool UserService::deleteUser(const std::string& id) {
    try {
        return _user_dao.deleteUser(id);
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Error deleting user {}: {}", id, e.what());
        throw UserServiceException("Failed to delete user due to a database error.");
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error deleting user {}: {}", id, e.what());
        throw UserServiceException("An unexpected error occurred during user deletion.");
    }
}