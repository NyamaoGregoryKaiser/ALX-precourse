#pragma once

#include "models/User.h"
#include "database/UserRepository.h"
#include <string>
#include <optional>
#include <vector>

// Forward declaration for jwt-cpp
namespace jwt {
    namespace algorithm {
        struct hs256; // Example algorithm
    }
    namespace builder {
        class token;
    }
    namespace verify {
        class verifier;
    }
}

class AuthService {
public:
    AuthService();

    // Registers a new user
    std::optional<User> register_user(const std::string& username, const std::string& email, const std::string& password);

    // Authenticates a user and returns a JWT token
    std::optional<std::string> login_user(const std::string& username, const std::string& password, const std::string& jwt_secret);

    // Hashes a password using a secure algorithm (e.g., bcrypt simulation)
    std::string hash_password(const std::string& password);

    // Verifies a password against a hash
    bool verify_password(const std::string& password, const std::string& hash);

    // Validate and decode JWT token (used by middleware)
    std::optional<AuthToken> decode_jwt(const std::string& token, const std::string& jwt_secret);

private:
    UserRepository user_repo_;

    // Helper to generate a JWT token
    std::string generate_jwt(const User& user, const std::string& secret);
};