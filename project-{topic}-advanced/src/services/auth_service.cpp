```cpp
#include "auth_service.h"
#include <cryptopp/sha.h> // For SHA256 (stronger than what's needed for PWD hash usually)
#include <cryptopp/hex.h> // For hexadecimal encoding
#include <string>
#include <iostream>

namespace mobile_backend {
namespace services {

// Simple, insecure password hashing/verification for demonstration.
// In a real application, use a dedicated library like Argon2, bcrypt, or scrypt.
// CryptoPP is used here to show a basic cryptographic library integration, but
// it's not a substitute for a proper KDF for password storage.
std::string AuthService::hash_password(const std::string& password) {
    std::string hash;
    CryptoPP::SHA256 hasher;
    CryptoPP::StringSource(password, true,
        new CryptoPP::HashFilter(hasher,
            new CryptoPP::HexEncoder(
                new CryptoPP::StringSink(hash)
            ) // HexEncoder
        ) // HashFilter
    ); // StringSource
    return hash;
}

bool AuthService::verify_password(const std::string& password, const std::string& hashed_password) {
    return hash_password(password) == hashed_password;
}

AuthService::AuthService(utils::Database& db_instance, utils::JwtManager& jwt_manager_instance)
    : db(db_instance), jwt_manager(jwt_manager_instance) {}

std::optional<models::User> AuthService::get_user_by_identifier(const std::string& identifier) {
    std::string sql = "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ? OR email = ?;";
    std::vector<std::string> params = {identifier, identifier};
    
    auto results = db.fetch_query(sql, params);

    if (results.empty()) {
        return std::nullopt;
    }

    models::User user;
    for (const auto& col : results[0].columns) {
        if (col.first == "id") user.id = std::stoi(col.second);
        else if (col.first == "username") user.username = col.second;
        else if (col.first == "email") user.email = col.second;
        else if (col.first == "password_hash") user.password_hash = col.second;
        else if (col.first == "created_at") user.created_at = col.second;
    }
    return user;
}


models::User AuthService::register_user(const std::string& username, const std::string& email, const std::string& password) {
    if (username.empty() || email.empty() || password.empty()) {
        throw AuthException("Username, email, and password cannot be empty.");
    }
    if (password.length() < 6) { // Minimum password length
        throw AuthException("Password must be at least 6 characters long.");
    }

    // Check if username or email already exists
    if (get_user_by_identifier(username) || get_user_by_identifier(email)) {
        LOG_WARN("Registration attempt with existing username or email: {} / {}", username, email);
        throw AuthException("Username or email already registered.");
    }

    std::string hashed_password = hash_password(password);
    std::string sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?);";
    std::vector<std::string> params = {username, email, hashed_password};

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to insert new user into database: username={}, email={}", username, email);
        throw AuthException("Failed to register user due to database error.");
    }

    models::User new_user;
    new_user.id = static_cast<int>(db.get_last_insert_rowid());
    new_user.username = username;
    new_user.email = email;
    new_user.password_hash = hashed_password; // For internal use, not sent to client
    new_user.created_at = utils::Database::get_current_timestamp();

    LOG_INFO("New user registered successfully with ID: {}", new_user.id);
    return new_user;
}

std::string AuthService::login_user(const std::string& identifier, const std::string& password) {
    if (identifier.empty() || password.empty()) {
        throw AuthException("Identifier and password cannot be empty.");
    }

    std::optional<models::User> user = get_user_by_identifier(identifier);
    if (!user) {
        LOG_WARN("Login attempt with non-existent identifier: {}", identifier);
        throw AuthException("Invalid credentials.");
    }

    if (!verify_password(password, user->password_hash)) {
        LOG_WARN("Login attempt with incorrect password for user: {}", user->username);
        throw AuthException("Invalid credentials.");
    }

    // Generate JWT token
    std::string token = jwt_manager.create_token(user->id, user->username);
    if (token.empty()) {
        LOG_ERROR("Failed to generate JWT token for user_id: {}", user->id);
        throw AuthException("Authentication failed: could not generate token.");
    }

    LOG_INFO("User {} (ID: {}) logged in successfully.", user->username, user->id);
    return token;
}

} // namespace services
} // namespace mobile_backend
```