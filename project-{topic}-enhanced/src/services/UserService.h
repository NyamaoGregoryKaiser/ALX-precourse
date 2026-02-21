```cpp
#ifndef USERSERVICE_H
#define USERSERVICE_H

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>
#include <optional>

#include "../models/User.h"
#include "../utils/Logger.h"
#include "../utils/Crypto.h"
#include "../exceptions/ApiException.h"

class UserService {
public:
    UserService(std::shared_ptr<pqxx::connection> conn) : db_conn(std::move(conn)) {}

    // Get user by ID
    std::optional<User> get_user(const std::string& user_id) {
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1",
                user_id
            );

            if (r.empty()) {
                return std::nullopt;
            }

            User user;
            user.id = r[0]["id"].as<std::string>();
            user.username = r[0]["username"].as<std::string>();
            user.email = r[0]["email"].as<std::string>();
            user.created_at = r[0]["created_at"].as<std::string>();
            user.updated_at = r[0]["updated_at"].as<std::string>();
            return user;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error fetching user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching user.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update user details
    User update_user(const std::string& user_id, const std::optional<std::string>& username,
                     const std::optional<std::string>& email, const std::optional<std::string>& password) {
        
        if (!username && !email && !password) {
            throw ApiException(crow::BAD_REQUEST, "No fields provided for update.");
        }

        std::vector<std::string> set_clauses;
        std::vector<pqxx::param_type> params;
        int param_idx = 1;

        if (username) {
            set_clauses.push_back("username = $" + std::to_string(param_idx++));
            params.push_back(*username);
        }
        if (email) {
            set_clauses.push_back("email = $" + std::to_string(param_idx++));
            params.push_back(*email);
        }
        if (password) {
            if (password->length() < 8) {
                throw ApiException(crow::BAD_REQUEST, "Password must be at least 8 characters long.");
            }
            std::string password_hash = Crypto::hash_password(*password);
            set_clauses.push_back("password_hash = $" + std::to_string(param_idx++));
            params.push_back(password_hash);
        }

        std::string update_query = "UPDATE users SET " + set_clauses[0];
        for (size_t i = 1; i < set_clauses.size(); ++i) {
            update_query += ", " + set_clauses[i];
        }
        update_query += " WHERE id = $" + std::to_string(param_idx++) + " RETURNING id, username, email, created_at, updated_at";
        params.push_back(user_id);

        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(update_query, params);
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "User not found or no changes made.");
            }

            User updated_user;
            updated_user.id = r[0]["id"].as<std::string>();
            updated_user.username = r[0]["username"].as<std::string>();
            updated_user.email = r[0]["email"].as<std::string>();
            updated_user.created_at = r[0]["created_at"].as<std::string>();
            updated_user.updated_at = r[0]["updated_at"].as<std::string>();
            LOG_INFO("User {} updated.", user_id);
            return updated_user;

        } catch (const pqxx::unique_violation& e) {
             if (std::string(e.what()).find("users_email_key") != std::string::npos) {
                throw ApiException(crow::CONFLICT, "User with this email already exists.");
            }
            if (std::string(e.what()).find("users_username_key") != std::string::npos) {
                throw ApiException(crow::CONFLICT, "User with this username already exists.");
            }
            LOG_ERROR("Unique constraint violation updating user {}: {}", user_id, e.what());
            throw ApiException(crow::CONFLICT, "Update failed due to existing username or email.");
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error updating user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error updating user.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error updating user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during user update.");
        }
    }

    // Delete user
    void delete_user(const std::string& user_id) {
        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(
                "DELETE FROM users WHERE id = $1 RETURNING id",
                user_id
            );
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::NOT_FOUND, "User not found.");
            }
            LOG_INFO("User {} deleted.", user_id);
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error deleting user {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error deleting user.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error deleting user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during user deletion.");
        }
    }

private:
    std::shared_ptr<pqxx::connection> db_conn;
};

#endif // USERSERVICE_H
```