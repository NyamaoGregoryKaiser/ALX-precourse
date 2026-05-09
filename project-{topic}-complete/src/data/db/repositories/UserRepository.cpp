```cpp
#include "UserRepository.h"
#include "core/common/Utils.h" // For get_current_timestamp

namespace VisuFlow {
namespace Data {
namespace DB {

UserRepository::UserRepository() {
    VisuFlow::Util::Logger::log(spdlog::level::debug, "UserRepository initialized.");
}

Model::User UserRepository::findById(long long userId) {
    Model::User user; // Default uninitialized user
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params(
            "SELECT id, username, hashed_password, email, role, created_at, updated_at FROM users WHERE id = $1",
            userId
        );

        if (!r.empty()) {
            user = mapRowToUser(r[0]);
        }
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error in findById: {}", e.what());
        throw Util::APIException("Database error finding user by ID.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error in findById: {}", e.what());
        throw Util::APIException("Internal server error finding user by ID.", 500);
    }
    return user;
}

Model::User UserRepository::findByUsername(const std::string& username) {
    Model::User user;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params(
            "SELECT id, username, hashed_password, email, role, created_at, updated_at FROM users WHERE username = $1",
            username
        );

        if (!r.empty()) {
            user = mapRowToUser(r[0]);
        }
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error in findByUsername: {}", e.what());
        throw Util::APIException("Database error finding user by username.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error in findByUsername: {}", e.what());
        throw Util::APIException("Internal server error finding user by username.", 500);
    }
    return user;
}

Model::User UserRepository::create(const std::string& username, const std::string& hashedPassword,
                                  const std::string& email, const std::string& role) {
    Model::User newUser;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        std::string currentTime = Core::Common::Utils::get_current_timestamp();
        pqxx::result r = txn.exec_params(
            "INSERT INTO users (username, hashed_password, email, role, created_at, updated_at) "
            "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            username, hashedPassword, email, role, currentTime, currentTime
        );
        txn.commit();

        if (!r.empty()) {
            newUser.id = r[0]["id"].as<long long>();
            newUser.username = username;
            newUser.hashedPassword = hashedPassword;
            newUser.email = email;
            newUser.role = role;
            newUser.createdAt = currentTime;
            newUser.updatedAt = currentTime;
        }
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error creating user: {}", e.what());
        if (e.sqlstate() == "23505") { // Unique violation
            throw Util::APIException("Username or email already exists.", 409);
        }
        throw Util::APIException("Database error creating user.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error creating user: {}", e.what());
        throw Util::APIException("Internal server error creating user.", 500);
    }
    return newUser;
}

Model::User UserRepository::update(const Model::User& user) {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        std::string currentTime = Core::Common::Utils::get_current_timestamp();
        pqxx::result r = txn.exec_params(
            "UPDATE users SET username = $1, hashed_password = $2, email = $3, role = $4, updated_at = $5 WHERE id = $6 RETURNING *",
            user.username, user.hashedPassword, user.email, user.role, currentTime, user.id
        );
        txn.commit();

        if (r.empty()) {
            throw Util::APIException("User not found for update.", 404);
        }
        return mapRowToUser(r[0]);
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error updating user: {}", e.what());
        if (e.sqlstate() == "23505") {
            throw Util::APIException("Updated username or email already exists.", 409);
        }
        throw Util::APIException("Database error updating user.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error updating user: {}", e.what());
        throw Util::APIException("Internal server error updating user.", 500);
    }
}

void UserRepository::remove(long long userId) {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params("DELETE FROM users WHERE id = $1 RETURNING id", userId);
        txn.commit();

        if (r.empty()) {
            throw Util::APIException("User not found for deletion.", 404);
        }
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error deleting user: {}", e.what());
        throw Util::APIException("Database error deleting user.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error deleting user: {}", e.what());
        throw Util::APIException("Internal server error deleting user.", 500);
    }
}

Model::User UserRepository::mapRowToUser(const pqxx::row& row) {
    Model::User user;
    user.id = row["id"].as<long long>();
    user.username = row["username"].as<std::string>();
    user.hashedPassword = row["hashed_password"].as<std::string>();
    user.email = row["email"].as<std::string>();
    user.role = row["role"].as<std::string>();
    user.createdAt = row["created_at"].as<std::string>();
    user.updatedAt = row["updated_at"].as<std::string>();
    return user;
}

} // namespace DB
} // namespace Data
} // namespace VisuFlow
```