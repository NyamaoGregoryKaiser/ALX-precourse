#include "user.h"
#include <sstream>
#include <iomanip> // For std::put_time
#include <chrono>  // For std::chrono::system_clock
#include <algorithm> // For std::transform

#include "src/utils/logger.h"
#include "src/utils/exceptions.h"

// Helper function to get current timestamp in ISO 8601 format
std::string User::get_current_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%dT%H:%M:%S%z");
    std::string timestamp = ss.str();

    // Adjust timezone format from '+0000' to '+00:00' if necessary
    if (timestamp.length() > 2 && timestamp[timestamp.length() - 3] != ':') {
        timestamp.insert(timestamp.length() - 2, ":");
    }
    return timestamp;
}

std::string user_role_to_string(UserRole role) {
    switch (role) {
        case UserRole::USER: return "user";
        case UserRole::ADMIN: return "admin";
        default: return "unknown";
    }
}

UserRole string_to_user_role(const std::string& role_str) {
    std::string lower_str = role_str;
    std::transform(lower_str.begin(), lower_str.end(), lower_str.begin(), ::tolower);
    if (lower_str == "admin") {
        return UserRole::ADMIN;
    }
    return UserRole::USER; // Default to USER
}

User::User(long id, const std::string& username, const std::string& password_hash,
           UserRole role, const std::string& created_at, const std::string& updated_at)
    : id(id), username(username), password_hash(password_hash), role(role),
      created_at(created_at), updated_at(updated_at) {}

std::optional<User> User::from_db_row(const DbRow& row) {
    if (row.columns.empty()) {
        return std::nullopt;
    }

    try {
        User user;
        user.id = std::stoll(row.columns.at("id"));
        user.username = row.columns.at("username");
        user.password_hash = row.columns.at("password_hash");
        user.role = string_to_user_role(row.columns.at("role"));
        user.created_at = row.columns.at("created_at");
        user.updated_at = row.columns.at("updated_at");
        return user;
    } catch (const std::out_of_range& e) {
        LOG_ERROR("Missing column in DbRow for User: " + std::string(e.what()));
        return std::nullopt;
    } catch (const std::exception& e) {
        LOG_ERROR("Error converting DbRow to User: " + std::string(e.what()));
        return std::nullopt;
    }
}

Json::Value User::to_json(bool include_sensitive_data) const {
    Json::Value user_json;
    user_json["id"] = (Json::Int64)id;
    user_json["username"] = username;
    user_json["role"] = user_role_to_string(role);
    user_json["created_at"] = created_at;
    user_json["updated_at"] = updated_at;
    
    if (include_sensitive_data) {
        user_json["password_hash"] = password_hash; // Be careful with this in production APIs!
    }
    return user_json;
}

std::optional<User> User::create(const std::string& username, const std::string& password_hash, UserRole role) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string current_time = get_current_timestamp();

    std::string sql = "INSERT INTO users (username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?);";
    std::vector<std::pair<int, std::string>> params = {
        {1, username},
        {2, password_hash},
        {3, user_role_to_string(role)},
        {4, current_time},
        {5, current_time}
    };

    try {
        db.execute_non_query_prepared(sql, params);
        long new_id = db.last_insert_rowid();
        return User(new_id, username, password_hash, role, current_time, current_time);
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to create user: " + std::string(e.what()));
        // Check for unique constraint violation (username)
        if (std::string(e.what()).find("SQLITE_CONSTRAINT_UNIQUE") != std::string::npos) {
            throw ConflictException("Username already exists.");
        }
        throw; // Re-throw other database exceptions
    }
}

std::optional<User> User::find_by_id(long id) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, username, password_hash, role, created_at, updated_at FROM users WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, std::to_string(id)}
    };

    try {
        std::vector<DbRow> rows = db.execute_query_prepared(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        return from_db_row(rows[0]);
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find user by ID: " + std::string(e.what()));
        throw;
    }
}

std::optional<User> User::find_by_username(const std::string& username) {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, username, password_hash, role, created_at, updated_at FROM users WHERE username = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, username}
    };

    try {
        std::vector<DbRow> rows = db.execute_query_prepared(sql, params);
        if (rows.empty()) {
            return std::nullopt;
        }
        return from_db_row(rows[0]);
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find user by username: " + std::string(e.what()));
        throw;
    }
}

std::vector<User> User::find_all() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "SELECT id, username, password_hash, role, created_at, updated_at FROM users;";

    try {
        std::vector<DbRow> rows = db.query(sql);
        std::vector<User> users;
        for (const auto& row : rows) {
            if (auto user = from_db_row(row)) {
                users.push_back(*user);
            }
        }
        return users;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to find all users: " + std::string(e.what()));
        throw;
    }
}

bool User::update() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string current_time = get_current_timestamp();

    std::string sql = "UPDATE users SET username = ?, password_hash = ?, role = ?, updated_at = ? WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, username},
        {2, password_hash},
        {3, user_role_to_string(role)},
        {4, current_time},
        {5, std::to_string(id)}
    };

    try {
        int affected_rows = db.execute_non_query_prepared(sql, params);
        if (affected_rows > 0) {
            updated_at = current_time; // Update object's timestamp
            return true;
        }
        return false;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to update user ID " + std::to_string(id) + ": " + std::string(e.what()));
         if (std::string(e.what()).find("SQLITE_CONSTRAINT_UNIQUE") != std::string::npos) {
            throw ConflictException("Username already exists.");
        }
        throw;
    }
}

bool User::remove() {
    DatabaseManager& db = DatabaseManager::getInstance();
    std::string sql = "DELETE FROM users WHERE id = ?;";
    std::vector<std::pair<int, std::string>> params = {
        {1, std::to_string(id)}
    };

    try {
        int affected_rows = db.execute_non_query_prepared(sql, params);
        return affected_rows > 0;
    } catch (const DatabaseException& e) {
        LOG_ERROR("Failed to delete user ID " + std::to_string(id) + ": " + std::string(e.what()));
        throw;
    }
}
```