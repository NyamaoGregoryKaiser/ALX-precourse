#ifndef USER_SERVICE_H
#define USER_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include <functional> // For std::function
#include "../models/User.h"
#include "../utils/Database.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"
#include <argon2.h> // For password hashing (replace with a real library like Argon2 or bcrypt)

// This is a placeholder for bcrypt/argon2 hashing.
// In a real app, you'd use a robust library like `argon2-c` or `libressl` (for bcrypt).
// For demonstration, a simple placeholder hash function.
std::string hash_password(const std::string& password) {
    // For a real application, use a strong password hashing library like Argon2, bcrypt, or scrypt.
    // Example using Argon2 (conceptual):
    // const int ARGON2_TIME_COST = 2;
    // const int ARGON2_MEMORY_COST = 65536;
    // const int ARGON2_PARALLELISM = 1;
    // const size_t HASH_LEN = 32; // 32 bytes for hash
    // const size_t SALT_LEN = 16; // 16 bytes for salt
    // unsigned char hash[HASH_LEN];
    // unsigned char salt[SALT_LEN];
    //
    // // Generate random salt (use a secure random number generator)
    // RAND_bytes(salt, SALT_LEN);
    //
    // char encoded[ARGON2_MAX_ENCODED_LEN];
    // argon2i_hash_encoded(ARGON2_TIME_COST, ARGON2_MEMORY_COST, ARGON2_PARALLELISM,
    //                      password.c_str(), password.length(),
    //                      salt, SALT_LEN,
    //                      HASH_LEN, encoded, ARGON2_MAX_ENCODED_LEN);
    // return std::string(encoded);

    // Placeholder: A simple, insecure hash for demonstration. DO NOT USE IN PRODUCTION.
    return "$2a$10$f0sDqA3eY/YyNnI8T8Xq.O4p5Xp7q6p8q9r0s1t2u3v4w5x6y7z." + password.substr(0, 5);
}

// Placeholder for password verification
bool verify_password(const std::string& password, const std::string& password_hash) {
    // For a real application, use the same library used for hashing.
    // Example using Argon2 (conceptual):
    // return argon2i_verify(password_hash.c_str(), password.c_str(), password.length()) == ARGON2_OK;

    // Placeholder: Insecure verification for demonstration. DO NOT USE IN PRODUCTION.
    return password_hash == ("$2a$10$f0sDqA3eY/YyNnI8T8Xq.O4p5Xp7q6p8q9r0s1t2u3v4w5x6y7z." + password.substr(0, 5));
}


class UserService {
private:
    Database& db;

    // Helper to convert JSON result to User object
    std::optional<User> json_to_user(const crow::json::wvalue& json) {
        if (!json.has("id") || !json.has("username") || !json.has("email") ||
            !json.has("password_hash") || !json.has("role") ||
            !json.has("created_at") || !json.has("updated_at")) {
            return std::nullopt;
        }
        return User(
            static_cast<long long>(json["id"].i()),
            json["username"].s(),
            json["email"].s(),
            json["password_hash"].s(),
            json["role"].s(),
            json["created_at"].s(),
            json["updated_at"].s()
        );
    }

public:
    UserService(Database& database_instance) : db(database_instance) {
        LOG_INFO("UserService initialized.");
    }

    /**
     * @brief Creates a new user in the database.
     * @param username The user's username.
     * @param email The user's email.
     * @param password The user's plain-text password (will be hashed).
     * @param role The user's role (e.g., "USER", "ADMIN").
     * @return The created User object with its assigned ID.
     * @throws ConflictException if username or email already exists.
     * @throws BadRequestException if password is too weak.
     */
    User createUser(const std::string& username, const std::string& email,
                    const std::string& password, const std::string& role) {
        // Basic validation
        if (password.length() < 8) {
            throw BadRequestException("Password must be at least 8 characters long.");
        }
        if (username.empty() || email.empty()) {
            throw BadRequestException("Username and email cannot be empty.");
        }
        if (role != AppConfig::ROLE_USER && role != AppConfig::ROLE_ADMIN) {
             throw BadRequestException("Invalid user role provided.");
        }

        // Check if username or email already exists
        if (findByUsername(username).has_value()) {
            throw ConflictException("Username already exists.");
        }
        if (findByEmail(email).has_value()) {
            throw ConflictException("Email already exists.");
        }

        std::string password_hashed = hash_password(password);

        try {
            db.execute(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                username, email, password_hashed, role
            );
            long long new_id = db.lastInsertRowId();
            LOG_INFO("User created with ID: {}", new_id);
            return getUserById(new_id).value(); // Retrieve the newly created user
        } catch (const ConflictException& e) { // Re-throw DB's conflict exception
            throw e;
        } catch (const InternalServerException& e) {
            LOG_ERROR("Failed to create user {}: {}", username, e.what());
            throw InternalServerException("Failed to create user account.");
        }
    }

    /**
     * @brief Retrieves a user by their ID.
     * @param id The ID of the user.
     * @return An optional User object.
     */
    std::optional<User> getUserById(long long id) {
        auto results = db.query("SELECT * FROM users WHERE id = ?", id);
        if (results.empty()) {
            LOG_DEBUG("User with ID {} not found.", id);
            return std::nullopt;
        }
        return json_to_user(results[0]);
    }

    /**
     * @brief Retrieves all users.
     * @return A vector of User objects.
     */
    std::vector<User> getAllUsers() {
        auto results = db.query("SELECT * FROM users");
        std::vector<User> users;
        for (const auto& json_user : results) {
            if (auto user = json_to_user(json_user)) {
                users.push_back(*user);
            }
        }
        LOG_DEBUG("Retrieved {} users.", users.size());
        return users;
    }

    /**
     * @brief Finds a user by their username.
     * @param username The username to search for.
     * @return An optional User object.
     */
    std::optional<User> findByUsername(const std::string& username) {
        auto results = db.query("SELECT * FROM users WHERE username = ?", username);
        if (results.empty()) {
            return std::nullopt;
        }
        return json_to_user(results[0]);
    }

    /**
     * @brief Finds a user by their email.
     * @param email The email to search for.
     * @return An optional User object.
     */
    std::optional<User> findByEmail(const std::string& email) {
        auto results = db.query("SELECT * FROM users WHERE email = ?", email);
        if (results.empty()) {
            return std::nullopt;
        }
        return json_to_user(results[0]);
    }

    /**
     * @brief Updates an existing user's details.
     * @param id The ID of the user to update.
     * @param email_opt Optional new email.
     * @param password_opt Optional new plain-text password.
     * @param role_opt Optional new role.
     * @return The updated User object.
     * @throws NotFoundException if the user does not exist.
     * @throws ConflictException if the new email already exists.
     * @throws BadRequestException if update data is invalid.
     */
    User updateUser(long long id,
                    const std::optional<std::string>& email_opt,
                    const std::optional<std::string>& password_opt,
                    const std::optional<std::string>& role_opt) {
        
        auto existing_user = getUserById(id);
        if (!existing_user) {
            throw NotFoundException("User not found.");
        }

        std::string update_sql = "UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";
        std::vector<std::string> params;

        if (email_opt) {
            if (findByEmail(*email_opt) && findByEmail(*email_opt)->id != id) {
                throw ConflictException("Email already in use by another user.");
            }
            update_sql += ", email = ?";
            params.push_back(*email_opt);
        }
        if (password_opt) {
            if (password_opt->length() < 8) {
                throw BadRequestException("New password must be at least 8 characters long.");
            }
            std::string password_hashed = hash_password(*password_opt);
            update_sql += ", password_hash = ?";
            params.push_back(password_hashed);
        }
        if (role_opt) {
            if (*role_opt != AppConfig::ROLE_USER && *role_opt != AppConfig::ROLE_ADMIN) {
                throw BadRequestException("Invalid user role provided.");
            }
            update_sql += ", role = ?";
            params.push_back(*role_opt);
        }

        if (params.empty()) {
            return existing_user.value(); // No updates requested
        }

        update_sql += " WHERE id = ?";
        params.push_back(std::to_string(id)); // Add ID for WHERE clause

        // Convert vector of strings to a format bind can use (simple direct binding for strings)
        // This part needs careful handling with VariadicBind.
        // For simplicity, we'll recreate the full query with parameters
        // A more robust solution might build a variadic argument list or use a helper.
        // For demonstration, a direct implementation:
        try {
            // This is a simplified way to bind a dynamic number of parameters.
            // SQLiteCpp's VariadicBind works with known types at compile time.
            // For dynamic parameters, you'd iterate through params and bind them.
            // Example:
            SQLite::Statement stmt(*db.getConnection(), update_sql);
            for (size_t i = 0; i < params.size(); ++i) {
                stmt.bind(static_cast<int>(i + 1), params[i]);
            }
            stmt.exec();
            db.releaseConnection(std::move(stmt.getDatabasePtr())); // Release connection manually

            LOG_INFO("User with ID {} updated.", id);
            return getUserById(id).value(); // Retrieve and return the updated user
        } catch (const ConflictException& e) {
            throw e;
        } catch (const InternalServerException& e) {
             LOG_ERROR("Failed to update user {}: {}", id, e.what());
             throw InternalServerException("Failed to update user account.");
        }
    }

    /**
     * @brief Deletes a user by their ID.
     * @param id The ID of the user to delete.
     * @return True if the user was deleted, false otherwise.
     * @throws NotFoundException if the user does not exist.
     */
    bool deleteUser(long long id) {
        if (!getUserById(id)) {
            throw NotFoundException("User not found.");
        }
        try {
            int rows_affected = db.execute("DELETE FROM users WHERE id = ?", id);
            if (rows_affected > 0) {
                LOG_INFO("User with ID {} deleted.", id);
                return true;
            }
            return false;
        } catch (const InternalServerException& e) {
            LOG_ERROR("Failed to delete user {}: {}", id, e.what());
            throw InternalServerException("Failed to delete user account.");
        }
    }
};

#endif // USER_SERVICE_H