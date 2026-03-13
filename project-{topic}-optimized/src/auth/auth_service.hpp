#ifndef CMS_AUTH_SERVICE_HPP
#define CMS_AUTH_SERVICE_HPP

#include <string>
#include <optional>
#include <memory>
#include <stdexcept>
#include <bcrypt.h> // For password hashing/verification
#include "../database/user_repository.hpp"
#include "../models/user.hpp"
#include "jwt_manager.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"

namespace cms::auth {

class AuthService {
public:
    AuthService(std::shared_ptr<cms::database::UserRepository> user_repo,
                std::shared_ptr<JwtManager> jwt_manager)
        : user_repo_(std::move(user_repo)), jwt_manager_(std::move(jwt_manager)) {
        if (!user_repo_ || !jwt_manager_) {
            throw std::runtime_error("AuthService requires valid UserRepository and JwtManager.");
        }
    }

    // Register a new user
    std::pair<cms::models::User, std::string> register_user(const std::string& username, const std::string& email, const std::string& password) {
        // Validate inputs
        if (username.empty() || email.empty() || password.empty()) {
            throw cms::common::BadRequestException("Username, email, and password cannot be empty.");
        }
        if (password.length() < 8) { // Example password policy
            throw cms::common::BadRequestException("Password must be at least 8 characters long.");
        }

        // Check if username or email already exists (handled by repository's create method)
        
        // Hash password
        std::string hashed_password = hash_password(password);

        cms::models::User new_user;
        new_user.username = username;
        new_user.email = email;
        new_user.password_hash = hashed_password;
        new_user.role = cms::models::UserRole::VIEWER; // Default role for new registrations

        try {
            cms::models::User created_user = user_repo_->create(new_user);
            LOG_INFO("User registered: {}", created_user.username);
            std::string token = jwt_manager_->create_token(created_user.id, created_user.username, cms::models::user_role_to_string(created_user.role));
            return {created_user, token};
        } catch (const cms::common::ConflictException& e) {
            LOG_WARN("Registration conflict: {}", e.what());
            throw; // Re-throw the conflict exception
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user registration: {}", e.what());
            throw cms::common::InternalServerError("Could not register user.");
        }
    }

    // Authenticate user and generate JWT
    std::optional<std::string> login_user(const std::string& username, const std::string& password) {
        if (username.empty() || password.empty()) {
            throw cms::common::BadRequestException("Username and password cannot be empty.");
        }

        std::optional<cms::models::User> user_opt = user_repo_->find_by_username(username);
        if (!user_opt) {
            LOG_WARN("Login attempt for non-existent user: {}", username);
            return std::nullopt; // User not found
        }

        cms::models::User user = *user_opt;

        if (verify_password(password, user.password_hash)) {
            LOG_INFO("User logged in: {}", user.username);
            return jwt_manager_->create_token(user.id, user.username, cms::models::user_role_to_string(user.role));
        } else {
            LOG_WARN("Failed login attempt for user: {}", username);
            return std::nullopt; // Incorrect password
        }
    }

private:
    std::shared_ptr<cms::database::UserRepository> user_repo_;
    std::shared_ptr<JwtManager> jwt_manager_;

    // Hash a password using bcrypt
    std::string hash_password(const std::string& password) {
        char salt[BCRYPT_HASH_BUFFER];
        char hash[BCRYPT_HASH_BUFFER];
        int ret = bcrypt_gensalt(10, salt); // 10 is the cost factor
        if (ret != 0) {
            LOG_CRITICAL("Failed to generate bcrypt salt.");
            throw std::runtime_error("Password hashing failed.");
        }
        ret = bcrypt_hashpw(password.c_str(), salt, hash);
        if (ret != 0) {
            LOG_CRITICAL("Failed to hash password with bcrypt.");
            throw std::runtime_error("Password hashing failed.");
        }
        return std::string(hash);
    }

    // Verify a password against a hash
    bool verify_password(const std::string& password, const std::string& hash) {
        char buffer[BCRYPT_HASH_BUFFER];
        int ret = bcrypt_hashpw(password.c_str(), hash.c_str(), buffer);
        if (ret != 0) {
            LOG_ERROR("Bcrypt verification error: {}", ret);
            return false; // Error during verification
        }
        return strcmp(buffer, hash.c_str()) == 0;
    }
};

} // namespace cms::auth

#endif // CMS_AUTH_SERVICE_HPP
```