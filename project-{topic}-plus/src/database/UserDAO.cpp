#include "UserDAO.h"
#include "../logger/Logger.h"
#include <uuid/uuid.h> // For UUID generation, if desired (or use simpler chrono-based ID)

UserDAO::UserDAO() : _db_manager(DBManager::get_instance()) {}

User UserDAO::user_from_row(const pqxx::row& row) {
    std::string id = row["id"].as<std::string>();
    std::string username = row["username"].as<std::string>();
    std::string email = row["email"].as<std::string>();
    std::string password_hash = row["password_hash"].as<std::string>();
    std::string role_str = row["role"].as<std::string>();
    std::string first_name = row["first_name"].as<std::string>();

    // Handle optional fields
    std::optional<std::string> last_name;
    if (!row["last_name"].is_null()) {
        last_name = row["last_name"].as<std::string>();
    }
    std::optional<std::string> phone_number;
    if (!row["phone_number"].is_null()) {
        phone_number = row["phone_number"].as<std::string>();
    }
    std::optional<std::string> address;
    if (!row["address"].is_null()) {
        address = row["address"].as<std::string>();
    }

    std::string created_at_str = row["created_at"].as<std::string>();
    std::string updated_at_str = row["updated_at"].as<std::string>();

    return User::fromSql(id, username, email, password_hash, role_str,
                         first_name, last_name, phone_number, address,
                         created_at_str, updated_at_str);
}

std::optional<User> UserDAO::createUser(const User& user) {
    try {
        std::string sql = "INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, phone_number, address, created_at, updated_at) "
                          "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id;";
        
        // Use a transaction for INSERT
        auto conn_guard = _db_manager.getConnection();
        pqxx::work T(*conn_guard);
        
        pqxx::result R = T.exec_params(sql,
            user.id, user.username, user.email, user.password_hash, user_role_to_string(user.role),
            user.first_name, user.last_name ? *user.last_name : pqxx::null<std::string>(),
            user.phone_number ? *user.phone_number : pqxx::null<std::string>(),
            user.address ? *user.address : pqxx::null<std::string>(),
            user.to_iso_string(user.created_at), user.to_iso_string(user.updated_at)
        );
        T.commit();
        _db_manager.returnConnection(conn_guard);

        if (!R.empty()) {
            // Return the newly created user (potentially re-fetch to ensure all fields are correctly loaded)
            return findUserById(R[0][0].as<std::string>());
        }
        return std::nullopt;
    } catch (const pqxx::unique_violation& e) {
        Logger::get_logger()->warn("User creation failed due to unique constraint violation: {}", e.what());
        // Re-throw specific exception for handling in service layer (e.g., username/email already exists)
        throw DatabaseException("Username or email already exists.");
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error creating user: {}", e.what());
        throw; // Re-throw custom database exception
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error creating user: {}", e.what());
        throw DatabaseException("Failed to create user: " + std::string(e.what()));
    }
}

std::optional<User> UserDAO::findUserById(const std::string& id) {
    try {
        std::string sql = "SELECT id, username, email, password_hash, role, first_name, last_name, phone_number, address, created_at, updated_at FROM users WHERE id = $1;";
        pqxx::result R = _db_manager.executeParameterizedQuery(sql, {id});
        if (!R.empty()) {
            return user_from_row(R[0]);
        }
        return std::nullopt;
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error finding user by ID: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error finding user by ID: {}", e.what());
        throw DatabaseException("Failed to find user by ID: " + std::string(e.what()));
    }
}

std::optional<User> UserDAO::findUserByUsername(const std::string& username) {
    try {
        std::string sql = "SELECT id, username, email, password_hash, role, first_name, last_name, phone_number, address, created_at, updated_at FROM users WHERE username = $1;";
        pqxx::result R = _db_manager.executeParameterizedQuery(sql, {username});
        if (!R.empty()) {
            return user_from_row(R[0]);
        }
        return std::nullopt;
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error finding user by username: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error finding user by username: {}", e.what());
        throw DatabaseException("Failed to find user by username: " + std::string(e.what()));
    }
}

std::optional<User> UserDAO::findUserByEmail(const std::string& email) {
    try {
        std::string sql = "SELECT id, username, email, password_hash, role, first_name, last_name, phone_number, address, created_at, updated_at FROM users WHERE email = $1;";
        pqxx::result R = _db_manager.executeParameterizedQuery(sql, {email});
        if (!R.empty()) {
            return user_from_row(R[0]);
        }
        return std::nullopt;
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error finding user by email: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error finding user by email: {}", e.what());
        throw DatabaseException("Failed to find user by email: " + std::string(e.what()));
    }
}

std::vector<User> UserDAO::findAllUsers(int limit, int offset) {
    std::vector<User> users;
    try {
        std::string sql = "SELECT id, username, email, password_hash, role, first_name, last_name, phone_number, address, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2;";
        pqxx::result R = _db_manager.executeParameterizedQuery(sql, {std::to_string(limit), std::to_string(offset)});
        for (const auto& row : R) {
            users.push_back(user_from_row(row));
        }
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error finding all users: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error finding all users: {}", e.what());
        throw DatabaseException("Failed to find all users: " + std::string(e.what()));
    }
    return users;
}

bool UserDAO::updateUser(const User& user) {
    try {
        std::string sql = "UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4, first_name = $5, last_name = $6, phone_number = $7, address = $8, updated_at = $9 WHERE id = $10;";
        
        auto conn_guard = _db_manager.getConnection();
        pqxx::work T(*conn_guard); // Use transaction for update
        
        pqxx::result R = T.exec_params(sql,
            user.username, user.email, user.password_hash, user_role_to_string(user.role),
            user.first_name, user.last_name ? *user.last_name : pqxx::null<std::string>(),
            user.phone_number ? *user.phone_number : pqxx::null<std::string>(),
            user.address ? *user.address : pqxx::null<std::string>(),
            user.to_iso_string(std::chrono::system_clock::now()), // Update updated_at
            user.id
        );
        T.commit();
        _db_manager.returnConnection(conn_guard);

        return R.affected_rows() == 1;
    } catch (const pqxx::unique_violation& e) {
        Logger::get_logger()->warn("User update failed due to unique constraint violation: {}", e.what());
        throw DatabaseException("Username or email already in use by another user.");
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error updating user: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error updating user: {}", e.what());
        throw DatabaseException("Failed to update user: " + std::string(e.what()));
    }
}

bool UserDAO::deleteUser(const std::string& id) {
    try {
        std::string sql = "DELETE FROM users WHERE id = $1;";
        _db_manager.executeParameterizedQuery(sql, {id}); // Simple delete command
        return true; // If no exception, assume success. Affected rows check could be added if needed.
    } catch (const DatabaseException& e) {
        Logger::get_logger()->error("Database error deleting user: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Unhandled error deleting user: {}", e.what());
        throw DatabaseException("Failed to delete user: " + std::string(e.what()));
    }
}