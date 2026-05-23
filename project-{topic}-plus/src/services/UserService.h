#ifndef USER_SERVICE_H
#define USER_SERVICE_H

#include "../models/User.h"
#include "../database/UserDAO.h"
#include <string>
#include <optional>
#include <vector>

// Custom exceptions for service layer
class UserServiceException : public std::runtime_error {
public:
    explicit UserServiceException(const std::string& message) : std::runtime_error(message) {}
};

class UserAlreadyExistsException : public UserServiceException {
public:
    explicit UserAlreadyExistsException(const std::string& message) : UserServiceException(message) {}
};

class UserNotFoundException : public UserServiceException {
public:
    explicit UserNotFoundException(const std::string& message) : UserServiceException(message) {}
};

class InvalidCredentialsException : public UserServiceException {
public:
    explicit InvalidCredentialsException(const std::string& message) : UserServiceException(message) {}
};

class UserService {
public:
    UserService();

    // Register a new user
    std::optional<User> registerUser(const User& newUser, const std::string& rawPassword);

    // Authenticate user, return user if successful
    std::optional<User> authenticateUser(const std::string& username_or_email, const std::string& password);

    // Get user by ID
    std::optional<User> getUserById(const std::string& id);

    // Get all users (with pagination)
    std::vector<User> getAllUsers(int limit = 100, int offset = 0);

    // Update user details
    std::optional<User> updateUser(const std::string& userId, const nlohmann::json& updateData);

    // Delete user
    bool deleteUser(const std::string& id);

private:
    UserDAO _user_dao;

    // Helper for basic input validation (e.g., email format)
    bool isValidEmail(const std::string& email);
    bool isValidPassword(const std::string& password);
};

#endif // USER_SERVICE_H