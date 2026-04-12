#include "UserRepository.h"
#include "utils/Logger.h"

// Helper function to map a database row to a User object
User UserRepository::row_to_user(const soci::row& r) {
    User user;
    user.id = r.get<int>("id");
    user.username = r.get<std::string>("username");
    user.email = r.get<std::string>("email");
    user.password_hash = r.get<std::string>("password_hash");
    if (auto role_str = r.get<std::string>("role"); !role_str.empty()) {
        user.role = string_to_user_role(role_str).value_or(UserRole::USER);
    }
    user.created_at = r.get<std::chrono::system_clock::time_point>("created_at");
    user.updated_at = r.get<std::chrono::system_clock::time_point>("updated_at");
    return user;
}

std::optional<User> UserRepository::create_user(const User& user) {
    soci::session sql = DatabaseManager::get_session();
    std::optional<User> created_user;
    try {
        int new_id = 0;
        std::string role_str = user_role_to_string(user.role);
        std::chrono::system_clock::time_point now = std::chrono::system_clock::now();

        sql << "INSERT INTO users (username, email, password_hash, role, created_at, updated_at) "
            "VALUES (:username, :email, :password_hash, :role, :created_at, :updated_at) "
            "RETURNING id",
            soci::use(user.username), soci::use(user.email), soci::use(user.password_hash),
            soci::use(role_str), soci::use(now), soci::use(now),
            soci::into(new_id);

        if (new_id > 0) {
            created_user = user;
            created_user->id = new_id;
            created_user->created_at = now;
            created_user->updated_at = now;
            LOG_INFO("User created: ID={}, Username={}", new_id, user.username);
        }
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error creating user {}: {}", user.username, e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
    return created_user;
}

std::optional<User> UserRepository::find_by_id(int id) {
    soci::session sql = DatabaseManager::get_session();
    std::optional<User> user;
    try {
        soci::row r;
        sql << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE id = :id",
            soci::use(id), soci::into(r);

        if (sql.got_data()) {
            user = row_to_user(r);
        }
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error finding user by ID {}: {}", id, e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
    return user;
}

std::optional<User> UserRepository::find_by_username(const std::string& username) {
    soci::session sql = DatabaseManager::get_session();
    std::optional<User> user;
    try {
        soci::row r;
        sql << "SELECT id, username, email, password_hash, role, created_at, updated_at FROM users WHERE username = :username",
            soci::use(username), soci::into(r);

        if (sql.got_data()) {
            user = row_to_user(r);
        }
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error finding user by username {}: {}", username, e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
    return user;
}

bool UserRepository::update_user(const User& user) {
    soci::session sql = DatabaseManager::get_session();
    bool success = false;
    try {
        std::string role_str = user_role_to_string(user.role);
        std::chrono::system_clock::time_point now = std::chrono::system_clock::now();
        int count = 0;
        sql << "UPDATE users SET username = :username, email = :email, password_hash = :password_hash, "
            "role = :role, updated_at = :updated_at WHERE id = :id",
            soci::use(user.username), soci::use(user.email), soci::use(user.password_hash),
            soci::use(role_str), soci::use(now), soci::use(user.id),
            soci::into(count);
        success = (count == 1);
        if (success) {
            LOG_INFO("User updated: ID={}, Username={}", user.id, user.username);
        } else {
            LOG_WARN("User update failed or user not found: ID={}", user.id);
        }
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error updating user {}: {}", user.id, e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
    return success;
}

bool UserRepository::delete_user(int id) {
    soci::session sql = DatabaseManager::get_session();
    bool success = false;
    try {
        int count = 0;
        sql << "DELETE FROM users WHERE id = :id", soci::use(id), soci::into(count);
        success = (count == 1);
        if (success) {
            LOG_INFO("User deleted: ID={}", id);
        } else {
            LOG_WARN("User deletion failed or user not found: ID={}", id);
        }
    } catch (const soci::soci_error& e) {
        LOG_ERROR("Error deleting user {}: {}", id, e.what());
    }
    DatabaseManager::release_session(std::make_unique<soci::session>(std::move(sql)));
    return success;
}