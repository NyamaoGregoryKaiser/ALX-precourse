#ifndef USER_SERVICE_H
#define USER_SERVICE_H

#include <drogon/orm/DbClient.h>
#include <json/json.h>
#include <optional>
#include <string>
#include <vector>

// Forward declarations
namespace drogon_model { namespace auth_system { class User; } }

class UserService {
public:
    UserService(drogon::orm::DbClientPtr dbClient);

    /**
     * @brief Retrieves a user by ID.
     * @param userId The ID of the user.
     * @return An optional Json::Value containing user data if found, empty otherwise.
     */
    drogon::AsyncTask<std::optional<Json::Value>> getUserById(int64_t userId);

    /**
     * @brief Retrieves all users.
     * @return A vector of Json::Value containing user data.
     */
    drogon::AsyncTask<std::vector<Json::Value>> getAllUsers();

    /**
     * @brief Updates an existing user's information.
     * @param userId The ID of the user to update.
     * @param userData A Json::Value containing the fields to update (e.g., username, email, enabled).
     * @return An optional Json::Value containing the updated user data if successful, empty otherwise.
     */
    drogon::AsyncTask<std::optional<Json::Value>> updateUser(int64_t userId, const Json::Value& userData);

    /**
     * @brief Deletes a user by ID.
     * @param userId The ID of the user to delete.
     * @return True if the user was successfully deleted, false otherwise.
     */
    drogon::AsyncTask<bool> deleteUser(int64_t userId);

    /**
     * @brief Assigns roles to a user.
     * @param userId The ID of the user.
     * @param roleNames A vector of role names to assign.
     * @return True if roles were successfully assigned, false otherwise.
     */
    drogon::AsyncTask<bool> assignRolesToUser(int64_t userId, const std::vector<std::string>& roleNames);

    /**
     * @brief Retrieves roles assigned to a user.
     * @param userId The ID of the user.
     * @return A vector of strings containing role names.
     */
    drogon::AsyncTask<std::vector<std::string>> getUserRoles(int64_t userId);

private:
    drogon::orm::DbClientPtr dbClient_;
};

#endif // USER_SERVICE_H
```