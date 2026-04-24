```cpp
#include "auth_service.h"
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill

// For a simple SHA256 simulation using <string> properties, NOT cryptographic
#include <string>
#include <vector>

// Dummy SHA256 implementation for demonstration purposes.
// **DO NOT USE THIS IN PRODUCTION.** Use a proper cryptographic library like OpenSSL, Crypto++ with bcrypt/scrypt/Argon2.
std::string simple_sha256_hash(const std::string& str) {
    // This is a minimal, non-cryptographic hash for demo
    // In a real application, use a proper hashing library (e.g., OpenSSL, Crypto++)
    // along with a strong, salted password hashing algorithm (e.g., bcrypt, scrypt, Argon2).
    std::hash<std::string> hasher;
    size_t hash_val = hasher(str);
    std::stringstream ss;
    ss << std::hex << std::setw(64) << std::setfill('0') << hash_val; // Fake 64-char hex string
    std::string result = ss.str();
    // Trim or pad to simulate SHA256 output length if hash_val is smaller
    if (result.length() > 64) {
        return result.substr(0, 64);
    } else if (result.length() < 64) {
        return std::string(64 - result.length(), '0') + result;
    }
    return result;
}


AuthService::AuthService(DBManager& db_manager, const std::string& jwt_secret)
    : db_manager_(db_manager), jwt_secret_(jwt_secret), logger_(spdlog::get("ecommerce_logger")) {
    if (!logger_) {
        logger_ = spdlog::stdout_color_mt("auth_service_logger");
    }
}

User AuthService::register_user(const std::string& username, const std::string& email, const std::string& password) {
    // Input validation
    if (username.length() < 3) {
        throw BadRequestException("Username must be at least 3 characters long.");
    }
    if (password.length() < 6) {
        throw BadRequestException("Password must be at least 6 characters long.");
    }
    // Basic email regex check could be added here
    if (email.find('@') == std::string::npos || email.find('.') == std::string::npos) {
        throw BadRequestException("Invalid email format.");
    }

    if (db_manager_.check_user_exists_by_email(email)) {
        throw ConflictException("User with this email already exists.");
    }
    if (db_manager_.check_user_exists_by_username(username)) {
        throw ConflictException("User with this username already exists.");
    }

    User new_user;
    new_user.username = username;
    new_user.email = email;
    new_user.password_hash = hash_password(password); // Hash the password
    new_user.role = UserRole::CUSTOMER; // Default role

    try {
        User created_user = db_manager_.create_user(new_user);
        logger_->info("New user registered: ID={}, Email={}", created_user.id, created_user.email);
        return created_user;
    } catch (const DBSQLException& e) {
        if (std::string(e.what()).find("unique_violation") != std::string::npos) {
            throw ConflictException("User with this email or username already exists.");
        }
        throw; // Re-throw other DB exceptions
    }
}

std::pair<std::string, User> AuthService::login_user(const std::string& email, const std::string& password) {
    std::optional<User> user_opt = db_manager_.find_user_by_email(email);
    if (!user_opt) {
        throw UnauthorizedException("Invalid email or password.");
    }

    User user = user_opt.value();
    if (!verify_password(password, user.password_hash)) {
        throw UnauthorizedException("Invalid email or password.");
    }

    // Generate JWT token
    std::map<std::string, std::string> claims;
    claims["user_id"] = std::to_string(user.id);
    claims["email"] = user.email;
    claims["role"] = user_role_to_string(user.role);

    std::string token = JWTUtil::create_token(claims, jwt_secret_);
    logger_->info("User logged in: ID={}, Email={}", user.id, user.email);
    return {token, user};
}

std::string AuthService::hash_password(const std::string& password) {
    // In production, use a library like libsodium, bcrypt, or Argon2
    // For this demo, we use a very simple, insecure hash simulation
    return simple_sha256_hash(password);
}

bool AuthService::verify_password(const std::string& password, const std::string& hashed_password) {
    // In production, use a library like libsodium, bcrypt, or Argon2
    // For this demo, we use a very simple, insecure hash simulation
    return hash_password(password) == hashed_password;
}
```