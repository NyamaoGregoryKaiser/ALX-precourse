```cpp
#include "UserService.h"
#include "../utils/StringUtil.h"
#include "../utils/TimeUtil.h"

namespace TaskManager {
namespace Services {

UserService::UserService(Database::Database& db, Cache::Cache& cache)
    : db_(db), cache_(cache) {}

std::string UserService::generateCacheKey(long long userId) {
    return "user_" + std::to_string(userId);
}

void UserService::invalidateUserCache(long long userId) {
    cache_.remove(generateCacheKey(userId));
    // Optionally invalidate by username as well if that's a common lookup path cached
    // For simplicity, we just invalidate by ID here.
}

void UserService::invalidateUserCache(const std::string& username) {
    // A more sophisticated cache would allow lookup by username, then ID.
    // For now, if we get a username, we'd need to query to get the ID, then invalidate.
    // Or, simply bypass cache for username-based lookups that modify data.
}

Models::User UserService::createUser(Models::User user) {
    if (user.username.empty() || user.password_hash.empty()) {
        throw Exceptions::ValidationException("Username and password cannot be empty.");
    }
    
    // Check if username already exists
    if (getUserByUsername(user.username)) {
        throw Exceptions::ConflictException("User with this username already exists.");
    }

    // Hash the password (using a proper KDF in production)
    user.password_hash = Utils::StringUtil::hashPassword(user.password_hash);
    
    std::string sql = "INSERT INTO users (username, password_hash, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
    std::vector<std::string> params;
    params.push_back(user.username);
    params.push_back(user.password_hash);
    params.push_back(user.email ? *user.email : "");
    params.push_back(Models::userRoleToString(user.role));
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());

    try {
        db_.preparedExecute(sql, params);
        user.id = db_.getLastInsertRowId();
        user.created_at = Utils::TimeUtil::getCurrentTimestamp();
        user.updated_at = Utils::TimeUtil::getCurrentTimestamp();
        Utils::Logger::getLogger()->info("User created: {}", user.username);
        return user;
    } catch (const Exceptions::DatabaseException& e) {
        if (std::string(e.what()).find("UNIQUE constraint failed") != std::string::npos) {
            throw Exceptions::ConflictException("A user with this username or email already exists.");
        }
        throw; // Re-throw other database exceptions
    }
}

std::optional<Models::User> UserService::getUserById(long long id) {
    auto cached_user_json = cache_.get(generateCacheKey(id));
    if (cached_user_json) {
        Utils::Logger::getLogger()->debug("Cache hit for user ID: {}", id);
        return Models::User::fromJson(*cached_user_json);
    }

    std::string sql = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE id = ?";
    std::vector<std::string> params = {std::to_string(id)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    if (!results.empty()) {
        auto user = mapRowToUser(results[0]);
        if (user) {
            cache_.set(generateCacheKey(id), user->toJson(true)); // Cache the user
        }
        return user;
    }
    return std::nullopt;
}

std::optional<Models::User> UserService::getUserByUsername(const std::string& username) {
    // Caching by username would require a separate key or a username->id mapping in cache
    // For simplicity, direct DB lookup for username
    std::string sql = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users WHERE username = ?";
    std::vector<std::string> params = {username};

    ResultSet results = db_.preparedQuery(sql, params);
    if (!results.empty()) {
        return mapRowToUser(results[0]);
    }
    return std::nullopt;
}

std::vector<Models::User> UserService::getAllUsers(int limit, int offset) {
    std::string sql = "SELECT id, username, password_hash, email, role, created_at, updated_at FROM users LIMIT ? OFFSET ?";
    std::vector<std::string> params = {std::to_string(limit), std::to_string(offset)};
    
    ResultSet results = db_.preparedQuery(sql, params);
    std::vector<Models::User> users;
    for (const auto& row : results) {
        if (auto user = mapRowToUser(row)) {
            users.push_back(*user);
        }
    }
    return users;
}

Models::User UserService::updateUser(long long id, const Models::User& user_updates) {
    std::optional<Models::User> existing_user = getUserById(id);
    if (!existing_user) {
        throw Exceptions::NotFoundException("User not found with ID: " + std::to_string(id));
    }

    // Check for username conflict if username is being updated
    if (!user_updates.username.empty() && user_updates.username != existing_user->username) {
        if (getUserByUsername(user_updates.username)) {
            throw Exceptions::ConflictException("Username '" + user_updates.username + "' already taken.");
        }
    }

    std::string sql = "UPDATE users SET username = ?, email = ?, role = ?, updated_at = ? WHERE id = ?";
    std::vector<std::string> params;
    params.push_back(user_updates.username.empty() ? existing_user->username : user_updates.username);
    params.push_back(user_updates.email ? *user_updates.email : (existing_user->email ? *existing_user->email : ""));
    params.push_back(Models::userRoleToString(user_updates.role == Models::UserRole::UNKNOWN ? existing_user->role : user_updates.role));
    params.push_back(Utils::TimeUtil::getCurrentTimestamp());
    params.push_back(std::to_string(id));

    db_.preparedExecute(sql, params);
    
    // Refresh the user object to return the most up-to-date information
    // and clear cache for this user
    invalidateUserCache(id);
    std::optional<Models::User> updated_user = getUserById(id);
    if (!updated_user) {
        throw Exceptions::InternalServerError("Failed to retrieve updated user data after update.");
    }
    Utils::Logger::getLogger()->info("User updated: ID {}", id);
    return *updated_user;
}

void UserService::deleteUser(long long id) {
    if (!getUserById(id)) {
        throw Exceptions::NotFoundException("User not found with ID: " + std::to_string(id));
    }

    std::string sql = "DELETE FROM users WHERE id = ?";
    db_.preparedExecute(sql, {std::to_string(id)});
    invalidateUserCache(id);
    Utils::Logger::getLogger()->info("User deleted: ID {}", id);
}

bool UserService::verifyUserPassword(const std::string& username, const std::string& plain_password) {
    std::optional<Models::User> user = getUserByUsername(username);
    if (!user) {
        return false; // User not found
    }
    // In production, use a proper password hashing library like bcrypt to verify
    return Utils::StringUtil::verifyPassword(plain_password, user->password_hash);
}

void UserService::changeUserPassword(long long id, const std::string& new_plain_password) {
    if (new_plain_password.empty()) {
        throw Exceptions::ValidationException("New password cannot be empty.");
    }

    std::optional<Models::User> user = getUserById(id);
    if (!user) {
        throw Exceptions::NotFoundException("User not found with ID: " + std::to_string(id));
    }

    std::string hashed_password = Utils::StringUtil::hashPassword(new_plain_password);
    std::string sql = "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?";
    db_.preparedExecute(sql, {hashed_password, Utils::TimeUtil::getCurrentTimestamp(), std::to_string(id)});
    invalidateUserCache(id);
    Utils::Logger::getLogger()->info("Password changed for user ID: {}", id);
}

bool UserService::isAdmin(long long user_id) {
    std::optional<Models::User> user = getUserById(user_id);
    return user && user->role == Models::UserRole::ADMIN;
}

bool UserService::isOwner(long long user_id, long long resource_owner_id) {
    return user_id == resource_owner_id;
}


std::optional<Models::User> UserService::mapRowToUser(const Database::Row& row) {
    if (row.empty()) return std::nullopt;

    Models::User user;
    try {
        if (row.count("id")) user.id = std::stoll(row.at("id"));
        if (row.count("username")) user.username = row.at("username");
        if (row.count("password_hash")) user.password_hash = row.at("password_hash");
        if (row.count("email")) user.email = row.at("email");
        if (row.count("role")) user.role = Models::stringToUserRole(row.at("role"));
        if (row.count("created_at")) user.created_at = row.at("created_at");
        if (row.count("updated_at")) user.updated_at = row.at("updated_at");
        return user;
    } catch (const std::exception& e) {
        Utils::Logger::getLogger()->error("Error mapping database row to User: {}", e.what());
        return std::nullopt;
    }
}

} // namespace Services
} // namespace TaskManager
```