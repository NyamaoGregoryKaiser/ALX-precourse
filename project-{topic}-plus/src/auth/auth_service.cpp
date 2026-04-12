#include "auth_service.h"
#include <argon2.h> // Example for strong hashing, if integrated. For now, simple approach.
#include <random> // For salt generation if not using a library that handles it

// Placeholder for a robust hashing function (e.g., Argon2 or BCrypt)
// In a real application, you would use a dedicated, secure hashing library.
std::string AuthService::hash_password(const std::string& password) {
    // THIS IS A SIMPLIFIED PLACEHOLDER.
    // DO NOT USE THIS IN PRODUCTION. Use libraries like Argon2 or BCrypt.
    // For demonstration, we'll just prepend a "salt_" and hash it with std::hash.
    // A real hash would be a fixed-size string, not variable.
    std::string salt = "random_salt_"; // In reality, generate unique salt per user
    std::hash<std::string> hasher;
    return salt + std::to_string(hasher(password + salt));
}

bool AuthService::verify_password(const std::string& password, const std::string& password_hash) {
    // THIS IS A SIMPLIFIED PLACEHOLDER.
    // DO NOT USE THIS IN PRODUCTION.
    std::string salt_prefix = "random_salt_";
    if (password_hash.rfind(salt_prefix, 0) == 0) { // Check if it starts with our placeholder salt
        std::string stored_hash_part = password_hash.substr(salt_prefix.length());
        std::hash<std::string> hasher;
        return stored_hash_part == std::to_string(hasher(password + salt_prefix));
    }
    // If it doesn't match our placeholder format, assume it's an old/invalid hash
    return false;
}

std::optional<User> AuthService::register_user(const std::string& username, const std::string& password, UserRole role) {
    // Input validation
    if (username.empty() || password.empty()) {
        throw BadRequestException("Username and password cannot be empty.");
    }
    if (password.length() < 6) { // Example password policy
        throw BadRequestException("Password must be at least 6 characters long.");
    }

    // Check if username already exists
    if (User::find_by_username(username)) {
        throw ConflictException("Username already taken.");
    }

    std::string hashed_password = hash_password(password);
    
    // Create the user in the database
    return User::create(username, hashed_password, role);
}

std::optional<std::string> AuthService::login_user(const std::string& username, const std::string& password) {
    // Input validation
    if (username.empty() || password.empty()) {
        throw BadRequestException("Username and password cannot be empty.");
    }

    // Find user by username
    std::optional<User> user = User::find_by_username(username);
    if (!user) {
        LOG_WARN("Login attempt with non-existent username: " + username);
        throw UnauthorizedException("Invalid credentials.");
    }

    // Verify password
    if (!verify_password(password, user->password_hash)) {
        LOG_WARN("Login attempt with incorrect password for user: " + username);
        throw UnauthorizedException("Invalid credentials.");
    }

    // Generate JWT token
    return generate_token(user->id, user->username, user->role);
}

std::string AuthService::generate_token(long user_id, const std::string& username, UserRole role) {
    auto token = jwt::create()
        .set_issuer("cpp-api-system")
        .set_type("JWT")
        .set_id(std::to_string(user_id)) // Subject is user ID
        .set_issued_at(std::chrono::system_clock::now())
        .set_expires_at(std::chrono::system_clock::now() + std::chrono::seconds{Config::JWT_EXPIRATION_SECONDS})
        .set_payload_claim("username", jwt::claim(username))
        .set_payload_claim("role", jwt::claim(user_role_to_string(role)))
        .sign(jwt::algorithm::hs256{Config::JWT_SECRET});

    return token;
}

std::optional<JwtPayload> AuthService::verify_token(const std::string& token) {
    try {
        auto decoded_token = jwt::decode(token);
        jwt::verifier verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{Config::JWT_SECRET})
            .with_issuer("cpp-api-system");
        
        verifier.verify(decoded_token);

        // Extract payload
        JwtPayload payload;
        payload.user_id = std::stol(decoded_token.get_id());
        payload.username = decoded_token.get_payload_claim("username").as_string();
        payload.role = string_to_user_role(decoded_token.get_payload_claim("role").as_string());
        
        return payload;
    } catch (const jwt::error::token_verification_exception& e) {
        LOG_WARN("JWT verification failed: " + std::string(e.what()));
        return std::nullopt;
    } catch (const std::exception& e) {
        LOG_ERROR("Error verifying JWT token: " + std::string(e.what()));
        return std::nullopt;
    }
}
```