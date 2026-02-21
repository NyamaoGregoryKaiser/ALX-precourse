```cpp
#ifndef AUTHSERVICE_H
#define AUTHSERVICE_H

#include <string>
#include <memory>
#include <pqxx/pqxx>
#include <optional>

#include "../models/User.h"
#include "../utils/Logger.h"
#include "../utils/Crypto.h"
#include "../config/AppConfig.h"
#include "../exceptions/ApiException.h"

class AuthService {
public:
    AuthService(std::shared_ptr<pqxx::connection> conn) : db_conn(std::move(conn)) {}

    // Registers a new user
    User register_user(const std::string& username, const std::string& email, const std::string& password) {
        if (username.empty() || email.empty() || password.empty()) {
            throw ApiException(crow::BAD_REQUEST, "Username, email, and password cannot be empty.");
        }
        if (password.length() < 8) {
            throw ApiException(crow::BAD_REQUEST, "Password must be at least 8 characters long.");
        }

        std::string password_hash = Crypto::hash_password(password);
        std::string user_id = Crypto::generate_uuid();

        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(
                "INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, email, created_at, updated_at",
                user_id, username, email, password_hash
            );
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::INTERNAL_SERVER_ERROR, "Failed to register user, no data returned.");
            }

            User user;
            user.id = r[0]["id"].as<std::string>();
            user.username = r[0]["username"].as<std::string>();
            user.email = r[0]["email"].as<std::string>();
            user.created_at = r[0]["created_at"].as<std::string>();
            user.updated_at = r[0]["updated_at"].as<std::string>();
            LOG_INFO("User registered: {}", user.email);
            return user;

        } catch (const pqxx::unique_violation& e) {
            if (std::string(e.what()).find("users_email_key") != std::string::npos) {
                throw ApiException(crow::CONFLICT, "User with this email already exists.");
            }
            if (std::string(e.what()).find("users_username_key") != std::string::npos) {
                throw ApiException(crow::CONFLICT, "User with this username already exists.");
            }
            LOG_ERROR("Unique constraint violation during user registration: {}", e.what());
            throw ApiException(crow::CONFLICT, "User registration failed due to existing username or email.");
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error during user registration: {}. Query: {}", e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error during registration.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user registration: {}", e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during registration.");
        }
    }

    // Authenticates a user and returns a JWT token
    std::string login_user(const std::string& email, const std::string& password) {
        if (email.empty() || password.empty()) {
            throw ApiException(crow::BAD_REQUEST, "Email and password cannot be empty.");
        }

        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                "SELECT id, username, email, password_hash FROM users WHERE email = $1",
                email
            );

            if (r.empty()) {
                LOG_WARN("Login failed for email {}: User not found.", email);
                throw ApiException(crow::UNAUTHORIZED, "Invalid credentials.");
            }

            std::string user_id = r[0]["id"].as<std::string>();
            std::string username = r[0]["username"].as<std::string>();
            std::string stored_hash = r[0]["password_hash"].as<std::string>();

            if (!Crypto::verify_password(password, stored_hash)) {
                LOG_WARN("Login failed for email {}: Incorrect password.", email);
                throw ApiException(crow::UNAUTHORIZED, "Invalid credentials.");
            }

            int jwt_expiry = AppConfig::get_jwt_expiry_seconds();
            std::string token = Crypto::create_jwt(user_id, username, jwt_expiry);
            LOG_INFO("User logged in: {}", email);
            return token;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error during user login: {}. Query: {}", e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error during login.");
        } catch (const ApiException&) {
            throw; // Re-throw specific API exceptions
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user login: {}", e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during login.");
        }
    }
    
    // Retrieves a user by ID
    std::optional<User> get_user_by_id(const std::string& user_id) {
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
            LOG_ERROR("SQL Error fetching user by ID {}: {}. Query: {}", user_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error fetching user.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error fetching user by ID {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


private:
    std::shared_ptr<pqxx::connection> db_conn;
};

#endif // AUTHSERVICE_H
```