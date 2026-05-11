#include "AuthService.h"
#include "../db/repositories/UserRepository.h"
#include "../models/User.h"
#include "../utils/Logger.h"

// For JWT handling, you'd integrate a library like jwt-cpp or similar.
// For demonstration, these are simplified mocks.
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <cryptopp/sha.h> // For password hashing
#include <cryptopp/hex.h> // For hex encoding hash

AuthService::AuthService(const std::string& jwt_secret)
    : jwt_secret_(jwt_secret) {
    if (jwt_secret_.length() < 32) { // Minimal length for a secure secret
        LOG_WARN("JWT_SECRET is too short. It should be at least 32 characters for security.");
    }
}

std::optional<std::string> AuthService::login(const std::string& username, const std::string& password, UserRepository& userRepo) {
    auto conn = userRepo.getDbConnection(); // Use the connection from repo for this specific action
    UserRepository local_user_repo(conn); // Create a temporary repo with the obtained connection

    std::optional<User> user = local_user_repo.findByUsername(username);

    if (user && verifyPassword(password, user->password_hash)) {
        LOG_INFO("User {} logged in successfully.", username);
        return generateToken(*user);
    }
    LOG_WARN("Failed login attempt for user: {}", username);
    return std::nullopt;
}

std::string AuthService::generateToken(const User& user) {
    // In a real app, use a JWT library (e.g., jwt-cpp)
    // This is a highly simplified, insecure mock
    auto now = std::chrono::system_clock::now();
    auto exp = now + std::chrono::hours(24); // Token valid for 24 hours

    std::stringstream ss;
    ss << "header.payload." << jwt_secret_; // Mock structure
    
    // In a real implementation:
    // jwt::builder builder = jwt::create()
    //                         .set_issuer("database-optimizer")
    //                         .set_type("JWT")
    //                         .set_issued_at(now)
    //                         .set_expires_at(exp)
    //                         .set_subject(user.username)
    //                         .set_payload_claim("userId", jwt::claim(std::to_string(user.id.value_or(0))))
    //                         .set_payload_claim("username", jwt::claim(user.username))
    //                         .set_payload_claim("role", jwt::claim(user.role));
    // return builder.sign(jwt::algorithm::hs256{jwt_secret_});

    LOG_DEBUG("Generated mock token for user {}", user.username);
    return "mock_jwt_token_for_" + user.username + "_" + std::to_string(user.id.value_or(0)) + "_" + user.role;
}

std::map<std::string, std::string> AuthService::verifyToken(const std::string& token) {
    // In a real app, use a JWT library to verify signature and claims
    // This is a highly simplified mock
    if (token.empty() || token.find("mock_jwt_token_for_") == std::string::npos) {
        LOG_WARN("Attempted to verify invalid mock token.");
        return {}; // Invalid mock token
    }

    // Parse mock token: "mock_jwt_token_for_username_id_role"
    size_t first_underscore = token.find("_", token.find("for_") + 4); // After "for_username"
    size_t second_underscore = token.find("_", first_underscore + 1); // After "id"

    if (first_underscore == std::string::npos || second_underscore == std::string::npos) {
        LOG_WARN("Failed to parse mock token format.");
        return {};
    }

    std::string username = token.substr(token.find("for_") + 4, first_underscore - (token.find("for_") + 4));
    std::string userId_str = token.substr(first_underscore + 1, second_underscore - (first_underscore + 1));
    std::string role = token.substr(second_underscore + 1);

    std::map<std::string, std::string> claims;
    claims["userId"] = userId_str;
    claims["username"] = username;
    claims["role"] = role;

    LOG_DEBUG("Verified mock token for user {}", username);
    return claims;
}

std::string AuthService::hashPassword(const std::string& password) {
    CryptoPP::SHA256 hash;
    std::string digest;
    CryptoPP::StringSource s(password, true, 
        new CryptoPP::HashFilter(hash,
            new CryptoPP::HexEncoder(
                new CryptoPP::StringSink(digest)
            )
        )
    );
    LOG_DEBUG("Hashed password (SHA256)");
    return digest;
}

bool AuthService::verifyPassword(const std::string& password, const std::string& hashed_password) {
    return hashPassword(password) == hashed_password;
}
```