```cpp
#include "user_service.h"
#include <algorithm> // For std::transform

namespace mobile_backend {
namespace services {

UserService::UserService(utils::Database& db_instance, utils::Cache<models::User>& user_cache_instance)
    : db(db_instance), user_cache(user_cache_instance) {}

std::optional<models::User> UserService::get_user_by_id(int user_id) {
    if (user_id <= 0) {
        LOG_WARN("Attempted to get user with invalid ID: {}", user_id);
        return std::nullopt;
    }

    // Try to get from cache first
    std::string cache_key = "user_id_" + std::to_string(user_id);
    if (auto cached_user = user_cache.get(cache_key)) {
        LOG_DEBUG("User ID {} found in cache.", user_id);
        return cached_user;
    }

    std::string sql = "SELECT id, username, email, created_at FROM users WHERE id = ?;";
    std::vector<std::string> params = {std::to_string(user_id)};

    auto results = db.fetch_query(sql, params);

    if (results.empty()) {
        LOG_INFO("User with ID {} not found in database.", user_id);
        return std::nullopt;
    }

    models::User user;
    for (const auto& col : results[0].columns) {
        if (col.first == "id") user.id = std::stoi(col.second);
        else if (col.first == "username") user.username = col.second;
        else if (col.first == "email") user.email = col.second;
        else if (col.first == "created_at") user.created_at = col.second;
    }

    // Cache the retrieved user
    user_cache.put(cache_key, user);
    LOG_DEBUG("User ID {} retrieved from DB and cached.", user_id);
    return user;
}

std::optional<models::User> UserService::get_user_by_username(const std::string& username) {
    if (username.empty()) {
        LOG_WARN("Attempted to get user with empty username.");
        return std::nullopt;
    }

    // Cache by username as well, or just rely on ID cache once fetched.
    // For simplicity, we'll fetch from DB and then use get_user_by_id logic.
    std::string sql = "SELECT id FROM users WHERE username = ?;";
    std::vector<std::string> params = {username};

    auto results = db.fetch_query(sql, params);
    if (results.empty()) {
        LOG_INFO("User with username '{}' not found in database.", username);
        return std::nullopt;
    }

    int user_id = std::stoi(results[0].columns[0].second); // Assuming id is the first column
    return get_user_by_id(user_id); // Re-use ID logic which handles caching
}


models::User UserService::update_user(int user_id,
                                      const std::optional<std::string>& new_username,
                                      const std::optional<std::string>& new_email) {
    if (user_id <= 0) {
        throw UserServiceException("Invalid user ID for update.");
    }

    std::string sql = "UPDATE users SET ";
    std::vector<std::string> params;
    std::vector<std::string> set_clauses;

    if (new_username && !new_username->empty()) {
        // Check if username already exists for another user
        std::string check_username_sql = "SELECT id FROM users WHERE username = ? AND id != ?;";
        auto check_username_results = db.fetch_query(check_username_sql, {*new_username, std::to_string(user_id)});
        if (!check_username_results.empty()) {
            throw UserServiceException("Username already taken.");
        }
        set_clauses.push_back("username = ?");
        params.push_back(*new_username);
    }
    if (new_email && !new_email->empty()) {
        // Check if email already exists for another user
        std::string check_email_sql = "SELECT id FROM users WHERE email = ? AND id != ?;";
        auto check_email_results = db.fetch_query(check_email_sql, {*new_email, std::to_string(user_id)});
        if (!check_email_results.empty()) {
            throw UserServiceException("Email already taken.");
        }
        set_clauses.push_back("email = ?");
        params.push_back(*new_email);
    }

    if (set_clauses.empty()) {
        throw UserServiceException("No valid fields provided for update.");
    }

    sql += crow::detail::join(set_clauses, ", ");
    sql += " WHERE id = ?;";
    params.push_back(std::to_string(user_id));

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to update user ID {}.", user_id);
        throw UserServiceException("Failed to update user due to database error.");
    }

    // Invalidate cache for this user
    user_cache.remove("user_id_" + std::to_string(user_id));

    // Fetch and return the updated user
    std::optional<models::User> updated_user = get_user_by_id(user_id);
    if (!updated_user) {
        throw UserServiceException("Failed to retrieve updated user data.");
    }
    LOG_INFO("User ID {} updated successfully.", user_id);
    return *updated_user;
}

void UserService::update_user_password(int user_id, const std::string& new_password) {
    if (user_id <= 0) {
        throw UserServiceException("Invalid user ID for password update.");
    }
    if (new_password.length() < 6) {
        throw UserServiceException("New password must be at least 6 characters long.");
    }

    std::string hashed_password = services::AuthService::hash_password(new_password); // Use AuthService's hashing
    std::string sql = "UPDATE users SET password_hash = ? WHERE id = ?;";
    std::vector<std::string> params = {hashed_password, std::to_string(user_id)};

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to update password for user ID {}.", user_id);
        throw UserServiceException("Failed to update password due to database error.");
    }

    // Invalidate cache for this user
    user_cache.remove("user_id_" + std::to_string(user_id));
    LOG_INFO("Password updated for user ID {}.", user_id);
}

void UserService::delete_user(int user_id) {
    if (user_id <= 0) {
        throw UserServiceException("Invalid user ID for deletion.");
    }

    // First, check if the user exists
    if (!get_user_by_id(user_id)) {
        throw UserServiceException("User not found.");
    }

    // SQLite FOREIGN KEY ON DELETE CASCADE will handle tasks deletion
    std::string sql = "DELETE FROM users WHERE id = ?;";
    std::vector<std::string> params = {std::to_string(user_id)};

    if (!db.execute_query(sql, params)) {
        LOG_ERROR("Failed to delete user ID {}.", user_id);
        throw UserServiceException("Failed to delete user due to database error.");
    }

    // Invalidate cache
    user_cache.remove("user_id_" + std::to_string(user_id));
    LOG_INFO("User ID {} deleted successfully.", user_id);
}

} // namespace services
} // namespace mobile_backend
```