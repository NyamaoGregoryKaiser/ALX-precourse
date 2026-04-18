#include "user_service.h"
#include "../utils/logger.h"
#include <algorithm> // For std::transform
#include <iomanip> // For std::put_time

// Simple SHA-256 for demo purposes. Use Argon2 in production!
#include <cryptopp/sha.h>
#include <cryptopp/hex.h>
#include <cryptopp/filters.h>

std::string sha256_hash(const std::string& input) {
    CryptoPP::SHA256 hash;
    std::string digest;

    CryptoPP::StringSource s(input, true,
        new CryptoPP::HashFilter(hash,
            new CryptoPP::HexEncoder(
                new CryptoPP::StringSink(digest),
                false // lower case
            )
        )
    );
    return digest;
}


UserService::UserService(DbManager& db_manager, JwtManager& jwt_manager)
    : db_manager_(db_manager), jwt_manager_(jwt_manager) {}

std::string UserService::hashPassword(const std::string& password) {
    // In production, use a strong password hashing library like Argon2
    // For this example, we'll use a simple SHA256.
    return sha256_hash(password);
}

bool UserService::verifyPassword(const std::string& password, const std::string& hashed_password) {
    // In production, use the same password hashing library to verify
    return sha256_hash(password) == hashed_password;
}

User UserService::createUser(User& user) {
    if (getUserByEmail(user.email)) {
        throw UserAlreadyExistsException("User with this email already exists.");
    }

    if (user.password_hash.empty()) {
        throw std::invalid_argument("Password cannot be empty.");
    }
    user.password_hash = hashPassword(user.password_hash);

    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at;";
        pqxx::result r = txn.exec_params(query, user.username, user.email, user.password_hash);

        if (!r.empty()) {
            user.id = r[0]["id"].as<std::string>();
            user.created_at = r[0]["created_at"].as<std::chrono::system_clock::time_point>();
            user.updated_at = r[0]["updated_at"].as<std::chrono::system_clock::time_point>();
            txn.commit();
            Logger::info("User created: {}", user.email);
            return user;
        }
        throw std::runtime_error("Failed to create user: No ID returned.");
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error creating user: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error creating user.");
    }
}

std::optional<User> UserService::getUserById(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1;";
        pqxx::result r = N.exec_params(query, id);

        if (!r.empty()) {
            return User(
                r[0]["id"].as<std::string>(),
                r[0]["username"].as<std::string>(),
                r[0]["email"].as<std::string>(),
                r[0]["password_hash"].as<std::string>(),
                r[0]["created_at"].as<std::chrono::system_clock::time_point>(),
                r[0]["updated_at"].as<std::chrono::system_clock::time_point>()
            );
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting user by ID: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving user.");
    }
    return std::nullopt;
}

std::optional<User> UserService::getUserByEmail(const std::string& email) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::nontransaction N(conn_guard.operator*());

    try {
        std::string query = "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1;";
        pqxx::result r = N.exec_params(query, email);

        if (!r.empty()) {
            return User(
                r[0]["id"].as<std::string>(),
                r[0]["username"].as<std::string>(),
                r[0]["email"].as<std::string>(),
                r[0]["password_hash"].as<std::string>(),
                r[0]["created_at"].as<std::chrono::system_clock::time_point>(),
                r[0]["updated_at"].as<std::chrono::system_clock::time_point>()
            );
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting user by email: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error retrieving user.");
    }
    return std::nullopt;
}


User UserService::updateUser(const std::string& id, const User& user_updates) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "UPDATE users SET ";
        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (!user_updates.username.empty()) {
            set_clauses.push_back("username = $" + std::to_string(param_idx++));
            params.push_back(user_updates.username);
        }
        if (!user_updates.email.empty()) {
            set_clauses.push_back("email = $" + std::to_string(param_idx++));
            params.push_back(user_updates.email);
        }
        if (!user_updates.password_hash.empty()) { // Assume password_hash field receives clear password to hash
            set_clauses.push_back("password_hash = $" + std::to_string(param_idx++));
            params.push_back(hashPassword(user_updates.password_hash));
        }

        if (set_clauses.empty()) {
            throw std::invalid_argument("No update fields provided.");
        }

        query += pqxx::to_string(pqxx::join(set_clauses, ", "));
        query += ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + std::to_string(param_idx++) + " RETURNING *;";
        params.push_back(id);

        pqxx::result r = txn.exec_params(query, params);

        if (!r.empty()) {
            txn.commit();
            Logger::info("User updated: {}", id);
            return User(
                r[0]["id"].as<std::string>(),
                r[0]["username"].as<std::string>(),
                r[0]["email"].as<std::string>(),
                r[0]["password_hash"].as<std::string>(),
                r[0]["created_at"].as<std::chrono::system_clock::time_point>(),
                r[0]["updated_at"].as<std::chrono::system_clock::time_point>()
            );
        }
        throw UserNotFoundException("User not found for update: " + id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error updating user: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error updating user.");
    }
}

void UserService::deleteUser(const std::string& id) {
    ConnectionGuard conn_guard(db_manager_);
    pqxx::work txn(conn_guard.operator*());

    try {
        std::string query = "DELETE FROM users WHERE id = $1;";
        pqxx::result r = txn.exec_params(query, id);

        if (r.affected_rows() == 0) {
            throw UserNotFoundException("User not found for deletion: " + id);
        }
        txn.commit();
        Logger::info("User deleted: {}", id);
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error deleting user: {} - Query: {}", e.what(), e.query());
        throw std::runtime_error("Database error deleting user.");
    }
}

std::string UserService::authenticateUser(const std::string& email, const std::string& password) {
    auto user_opt = getUserByEmail(email);
    if (!user_opt) {
        throw InvalidCredentialsException("User not found.");
    }

    User user = user_opt.value();
    if (!verifyPassword(password, user.password_hash)) {
        throw InvalidCredentialsException("Invalid password.");
    }

    // Generate JWT token
    return jwt_manager_.generateToken(user.id, user.username, user.email);
}
```