```cpp
#include "UserRepository.h"

UserRepository::UserRepository(std::shared_ptr<Database> db) : db_(std::move(db)) {
    // Prepare statements for efficiency and security (prevents SQL injection)
    // Use `if (!db_->getConnection().is_prepared("statement_name"))` for idempotent preparation
    try {
        if (!db_->getConnection().is_prepared("insert_user")) {
            db_->getConnection().prepare(
                "insert_user",
                "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at"
            );
        }
        if (!db_->getConnection().is_prepared("select_user_by_id")) {
            db_->getConnection().prepare(
                "select_user_by_id",
                "SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1"
            );
        }
        if (!db_->getConnection().is_prepared("select_user_by_email")) {
            db_->getConnection().prepare(
                "select_user_by_email",
                "SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1"
            );
        }
        if (!db_->getConnection().is_prepared("update_user")) {
            db_->getConnection().prepare(
                "update_user",
                "UPDATE users SET email = $1, password_hash = $2, role = $3, updated_at = NOW() WHERE id = $4"
            );
        }
        if (!db_->getConnection().is_prepared("delete_user")) {
            db_->getConnection().prepare(
                "delete_user",
                "DELETE FROM users WHERE id = $1"
            );
        }
        Logger::debug("User repository prepared statements.");
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error preparing user statements: {}", e.what());
        // Depending on severity, might re-throw or handle gracefully
    }
}

std::optional<User> UserRepository::create(const User& user) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "insert_user", user.getEmail(), user.getPasswordHash(), user.getRole()
        );
        trans->commit();

        if (!r.empty()) {
            User new_user = user; // Copy original user to transfer non-DB fields
            new_user.setId(r[0]["id"].as<int>());
            new_user.setCreatedAt(r[0]["created_at"].as<std::string>());
            new_user.setUpdatedAt(r[0]["updated_at"].as<std::string>());
            Logger::info("User created with ID: {}", *new_user.getId());
            return new_user;
        }
    } catch (const pqxx::unique_violation& e) {
        Logger::warn("User creation failed: Email '{}' already exists. {}", user.getEmail(), e.what());
        // Specific error for duplicate email, can be handled by API caller
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error creating user: {}", e.what());
    } catch (const std::exception& e) {
        Logger::error("Error creating user: {}", e.what());
    }
    return std::nullopt;
}

std::optional<User> UserRepository::findById(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_user_by_id", id);
        trans->commit();

        if (!r.empty()) {
            return User(
                r[0]["id"].as<int>(),
                r[0]["email"].as<std::string>(),
                r[0]["password_hash"].as<std::string>(),
                r[0]["role"].as<std::string>(),
                r[0]["created_at"].as<std::string>(),
                r[0]["updated_at"].as<std::string>()
            );
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding user by ID {}: {}", id, e.what());
    }
    return std::nullopt;
}

std::optional<User> UserRepository::findByEmail(const std::string& email) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_user_by_email", email);
        trans->commit();

        if (!r.empty()) {
            return User(
                r[0]["id"].as<int>(),
                r[0]["email"].as<std::string>(),
                r[0]["password_hash"].as<std::string>(),
                r[0]["created_at"].as<std::string>(),
                r[0]["updated_at"].as<std::string>(),
                r[0]["role"].as<std::string>()
            );
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding user by email {}: {}", email, e.what());
    }
    return std::nullopt;
}

bool UserRepository::update(const User& user) {
    if (!user.getId()) {
        Logger::error("Cannot update user without an ID.");
        return false;
    }
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "update_user",
            user.getEmail(), user.getPasswordHash(), user.getRole(), *user.getId()
        );
        trans->commit();
        Logger::info("User with ID {} updated.", *user.getId());
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error updating user {}: {}", *user.getId(), e.what());
    }
    return false;
}

bool UserRepository::remove(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("delete_user", id);
        trans->commit();
        Logger::info("User with ID {} deleted.", id);
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error deleting user {}: {}", id, e.what());
    }
    return false;
}
```