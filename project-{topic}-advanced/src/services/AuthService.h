#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <drogon/orm/DbClient.h>
#include <json/json.h>
#include <optional>
#include <string>

// Forward declarations
namespace drogon_model { namespace auth_system { class User; } }

class AuthService {
public:
    AuthService(drogon::orm::DbClientPtr dbClient);

    /**
     * @brief Registers a new user.
     * @param username The desired username.
     * @param email The user's email.
     * @param password The plain text password.
     * @return An optional Json::Value containing user data if successful, empty otherwise.
     */
    drogon::AsyncTask<std::optional<Json::Value>> registerUser(
        const std::string& username,
        const std::string& email,
        const std::string& password
    );

    /**
     * @brief Authenticates a user and generates a JWT token.
     * @param identifier The username or email.
     * @param password The plain text password.
     * @return An optional Json::Value containing the token and user data if successful, empty otherwise.
     */
    drogon::AsyncTask<std::optional<Json::Value>> loginUser(
        const std::string& identifier,
        const std::string& password
    );

    /**
     * @brief Logs out a user by invalidating their JWT token.
     * @param token The JWT token to invalidate.
     * @return True if logout is successful, false otherwise.
     */
    drogon::AsyncTask<bool> logoutUser(const std::string& token);

    /**
     * @brief Checks if a JWT token is blacklisted/invalidated.
     * @param token The JWT token to check.
     * @return True if the token is blacklisted, false otherwise.
     */
    drogon::AsyncTask<bool> isTokenBlacklisted(const std::string& token);

private:
    drogon::orm::DbClientPtr dbClient_;
    std::string jwtSecret_;

    /**
     * @brief Fetches JWT secret from environment variable.
     */
    void loadJwtSecret();
};

#endif // AUTH_SERVICE_H
```