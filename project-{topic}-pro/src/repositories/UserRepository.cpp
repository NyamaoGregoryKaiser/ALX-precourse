```cpp
#include "repositories/UserRepository.hpp"
#include "database/DatabaseManager.hpp"
#include "util/Logger.hpp"
#include "exceptions/ApiException.hpp" // For database specific errors

std::unique_ptr<pqxx::connection> UserRepository::getConnection() {
    return DatabaseManager::getConnection();
}

User UserRepository::mapRowToUser(const pqxx::row& row) {
    return User(
        row["id"].as<long>(),
        row["username"].as<std::string>(),
        row["email"].as<std::string>(),
        row["hashed_password"].as<std::string>(),
        nlohmann::json(row["role"].as<std::string>()).get<UserRole>(), // Convert string to enum
        row["created_at"].as<std::string>(),
        row["updated_at"].as<std::string>()
    );
}

std::optional<User> UserRepository::findById(long id) {
    try {
        auto conn = getConnection();
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec_params("SELECT id, username, email, hashed_password, role, created_at, updated_at FROM users WHERE id = $1", id);

        if (R.empty()) {
            return std::nullopt;
        }
        return mapRowToUser(R[0]);
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error in findById: {}", e.what());
        throw InternalServerErrorException("Database error finding user by ID.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error in findById: {}", e.what());
        throw;
    }
}

std::optional<User> UserRepository::findByUsername(const std::string& username) {
    try {
        auto conn = getConnection();
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec_params("SELECT id, username, email, hashed_password, role, created_at, updated_at FROM users WHERE username = $1", username);

        if (R.empty()) {
            return std::nullopt;
        }
        return mapRowToUser(R[0]);
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error in findByUsername: {}", e.what());
        throw InternalServerErrorException("Database error finding user by username.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error in findByUsername: {}", e.what());
        throw;
    }
}

std::optional<User> UserRepository::findByEmail(const std::string& email) {
    try {
        auto conn = getConnection();
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec_params("SELECT id, username, email, hashed_password, role, created_at, updated_at FROM users WHERE email = $1", email);

        if (R.empty()) {
            return std::nullopt;
        }
        return mapRowToUser(R[0]);
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error in findByEmail: {}", e.what());
        throw InternalServerErrorException("Database error finding user by email.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error in findByEmail: {}", e.what());
        throw;
    }
}

User UserRepository::create(const User& user) {
    try {
        auto conn = getConnection();
        pqxx::work W(*conn);
        pqxx::result R = W.exec_params(
            "INSERT INTO users (username, email, hashed_password, role, created_at, updated_at) "
            "VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, created_at, updated_at",
            user.username, user.email, user.hashedPassword, nlohmann::json(user.role).dump() // Convert enum to string
        );
        W.commit();

        User createdUser = user;
        createdUser.id = R[0]["id"].as<long>();
        createdUser.createdAt = R[0]["created_at"].as<std::string>();
        createdUser.updatedAt = R[0]["updated_at"].as<std::string>();
        Logger::get()->info("User created with ID: {}", createdUser.id);
        return createdUser;
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error creating user: {}", e.what());
        if (e.sqlstate() == "23505") { // Unique violation
            throw ConflictException("Username or email already exists.");
        }
        throw InternalServerErrorException("Database error creating user.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error creating user: {}", e.what());
        throw;
    }
}

User UserRepository::update(const User& user) {
    try {
        auto conn = getConnection();
        pqxx::work W(*conn);
        pqxx::result R = W.exec_params(
            "UPDATE users SET username=$1, email=$2, hashed_password=$3, role=$4, updated_at=NOW() WHERE id=$5 "
            "RETURNING updated_at",
            user.username, user.email, user.hashedPassword, nlohmann::json(user.role).dump(), user.id
        );
        W.commit();

        if (R.empty()) {
            throw NotFoundException("User with ID " + std::to_string(user.id) + " not found for update.");
        }
        User updatedUser = user;
        updatedUser.updatedAt = R[0]["updated_at"].as<std::string>();
        Logger::get()->info("User with ID {} updated.", updatedUser.id);
        return updatedUser;
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error updating user: {}", e.what());
        if (e.sqlstate() == "23505") { // Unique violation
            throw ConflictException("Username or email already exists.");
        }
        throw InternalServerErrorException("Database error updating user.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error updating user: {}", e.what());
        throw;
    }
}

void UserRepository::deleteById(long id) {
    try {
        auto conn = getConnection();
        pqxx::work W(*conn);
        pqxx::result R = W.exec_params("DELETE FROM users WHERE id = $1", id);
        W.commit();
        if (R.affected_rows() == 0) {
            throw NotFoundException("User with ID " + std::to_string(id) + " not found for deletion.");
        }
        Logger::get()->info("User with ID {} deleted.", id);
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error deleting user: {}", e.what());
        throw InternalServerErrorException("Database error deleting user.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error deleting user: {}", e.what());
        throw;
    }
}

std::vector<User> UserRepository::findAll() {
    std::vector<User> users;
    try {
        auto conn = getConnection();
        pqxx::nontransaction N(*conn);
        pqxx::result R = N.exec("SELECT id, username, email, hashed_password, role, created_at, updated_at FROM users ORDER BY id");

        for (const auto& row : R) {
            users.push_back(mapRowToUser(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::get()->error("SQL error in findAll: {}", e.what());
        throw InternalServerErrorException("Database error fetching all users.");
    } catch (const std::exception& e) {
        Logger::get()->error("Error in findAll: {}", e.what());
        throw;
    }
    return users;
}
```