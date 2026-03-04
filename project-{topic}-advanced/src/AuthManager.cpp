```cpp
#include "AuthManager.h"
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill
#include <random>  // For token generation
#include <chrono>  // For token expiry

namespace VisGenius {

AuthManager::AuthManager(std::shared_ptr<Database> db) : m_db(db) {
    // Ensure default admin user exists
    if (!m_db->getUserByUsername("admin")) {
        LOG_INFO("Creating default admin user: 'admin', password: 'admin'");
        registerUser("admin", "admin", "admin");
    }
}

std::string AuthManager::hashPassword(const std::string& password) const {
    // In a real application, use a strong, salted cryptographic hash function
    // like Argon2, scrypt, or bcrypt. For demonstration, a simple prefix.
    return "HASH_" + password;
}

bool AuthManager::verifyPassword(const std::string& password, const std::string& hashed_password) const {
    return hashPassword(password) == hashed_password;
}

bool AuthManager::registerUser(const std::string& username, const std::string& password, const std::string& role) {
    if (m_db->getUserByUsername(username)) {
        LOG_WARN("User registration failed: Username '{}' already exists.", username);
        return false;
    }

    User newUser;
    newUser.username = username;
    newUser.hashed_password = hashPassword(password);
    newUser.role = role;
    newUser.created_at.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    newUser.updated_at = newUser.created_at;

    try {
        int userId = m_db->createUser(newUser);
        if (userId > 0) {
            LOG_INFO("User '{}' registered successfully with ID {}.", username, userId);
            return true;
        }
    } catch (const DbException& e) {
        LOG_ERROR("DB Error registering user {}: {}", username, e.what());
    }
    return false;
}

std::unique_ptr<AuthToken> AuthManager::authenticate(const std::string& username, const std::string& password) {
    LOG_INFO("Attempting to authenticate user: {}", username);
    std::unique_ptr<User> user = m_db->getUserByUsername(username);

    if (!user) {
        LOG_WARN("Authentication failed for user '{}': User not found.", username);
        return nullptr;
    }

    if (!verifyPassword(password, user->hashed_password)) {
        LOG_WARN("Authentication failed for user '{}': Invalid password.", username);
        return nullptr;
    }

    // Generate a new token
    TimePoint expires_at;
    // Token valid for 24 hours
    expires_at.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch() + std::chrono::hours(24)
    ).count();

    std::unique_ptr<AuthToken> authToken = std::make_unique<AuthToken>();
    authToken->user_id = user->id;
    authToken->username = user->username;
    authToken->role = user->role;
    authToken->expires_at = expires_at;
    authToken->token = generateToken(user->id, user->username, user->role, expires_at);

    std::lock_guard<std::mutex> lock(m_mutex);
    m_activeTokens[authToken->token] = *authToken; // Store a copy
    LOG_INFO("User '{}' authenticated successfully. Token generated.", username);
    return authToken;
}

std::unique_ptr<AuthToken> AuthManager::validateToken(const std::string& token_str) {
    if (token_str.empty()) {
        return nullptr;
    }

    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_activeTokens.find(token_str);
    if (it == m_activeTokens.end()) {
        LOG_WARN("Token validation failed: Token not found in active tokens.");
        return nullptr;
    }

    // Check expiry
    long long current_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    if (it->second.expires_at.timestamp_ms < current_time_ms) {
        LOG_WARN("Token validation failed: Token expired for user '{}'.", it->second.username);
        m_activeTokens.erase(it); // Remove expired token
        return nullptr;
    }

    LOG_DEBUG("Token validated successfully for user: {}", it->second.username);
    return std::make_unique<AuthToken>(it->second); // Return a copy
}

bool AuthManager::authorize(const AuthToken& token, const std::string& required_role) {
    // Simple role-based access control.
    // In a real system, you'd have more granular permissions.
    if (token.role == "admin") {
        return true; // Admin can do anything
    }
    if (required_role == "viewer" && (token.role == "viewer" || token.role == "editor")) {
        return true;
    }
    if (required_role == "editor" && token.role == "editor") {
        return true;
    }
    // Add more specific role checks as needed
    LOG_WARN("Authorization failed for user '{}' (role: {}): Required role was '{}'.", token.username, token.role, required_role);
    return false;
}

std::string AuthManager::generateToken(int user_id, const std::string& username, const std::string& role, TimePoint expires_at) const {
    // This is a simple, insecure mock-up.
    // A real JWT would be cryptographically signed and encoded.
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> distrib(0, 255);

    std::stringstream ss;
    ss << std::hex << std::setfill('0');
    for (int i = 0; i < 32; ++i) { // 32 bytes random hex
        ss << std::setw(2) << distrib(gen);
    }
    
    std::string random_part = ss.str();
    
    // Combining user info with a random string and expiry for a unique but unverified token
    return std::to_string(user_id) + "." + username + "." + role + "." + std::to_string(expires_at.timestamp_ms) + "." + random_part;
}

std::unique_ptr<AuthToken> AuthManager::parseTokenString(const std::string& token_str) const {
    // This function would typically decode and verify a real JWT.
    // For this mock, it tries to split the string generated by generateToken.
    std::vector<std::string> parts;
    std::string segment;
    std::istringstream token_stream(token_str);
    while(std::getline(token_stream, segment, '.')) {
        parts.push_back(segment);
    }

    if (parts.size() != 5) {
        LOG_WARN("Invalid token format received: {}", token_str);
        return nullptr;
    }

    try {
        std::unique_ptr<AuthToken> token = std::make_unique<AuthToken>();
        token->user_id = std::stoi(parts[0]);
        token->username = parts[1];
        token->role = parts[2];
        token->expires_at.timestamp_ms = std::stoll(parts[3]);
        token->token = token_str; // Store the original token string

        return token;
    } catch (const std::exception& e) {
        LOG_ERROR("Error parsing token string '{}': {}", token_str, e.what());
        return nullptr;
    }
}

} // namespace VisGenius
```