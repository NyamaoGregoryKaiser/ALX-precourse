#pragma once

#include <string>
#include <optional>
#include <vector>
#include <stdexcept>
#include "../models/user.h"
#include "../database/db_manager.h"
#include "../utils/jwt_manager.h" // For password hashing

// Custom exceptions for UserService
class UserNotFoundException : public std::runtime_error {
public:
    explicit UserNotFoundException(const std::string& msg) : std::runtime_error(msg) {}
};

class UserAlreadyExistsException : public std::runtime_error {
public:
    explicit UserAlreadyExistsException(const std::string& msg) : std::runtime_error(msg) {}
};

class InvalidCredentialsException : public std::runtime_error {
public:
    explicit InvalidCredentialsException(const std::string& msg) : std::runtime_error(msg) {}
};

class UserService {
public:
    explicit UserService(DbManager& db_manager, JwtManager& jwt_manager);

    User createUser(User& user);
    std::optional<User> getUserById(const std::string& id);
    std::optional<User> getUserByEmail(const std::string& email);
    User updateUser(const std::string& id, const User& user_updates);
    void deleteUser(const std::string& id);

    std::string authenticateUser(const std::string& email, const std::string& password); // Returns JWT token

    // Placeholder for password hashing (in a real app, use Argon2)
    std::string hashPassword(const std::string& password);
    bool verifyPassword(const std::string& password, const std::string& hashed_password);

private:
    DbManager& db_manager_;
    JwtManager& jwt_manager_; // Used for hashing/verifying passwords here, for simplicity.
                              // In a real app, password hashing would be a separate utility.
};
```