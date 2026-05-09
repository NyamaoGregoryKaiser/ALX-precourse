```cpp
#ifndef VISUFLOW_USER_REPOSITORY_H
#define VISUFLOW_USER_REPOSITORY_H

#include "data/model/DataModels.h"
#include "data/db/Database.h" // For database connection
#include "util/Logger.h"
#include "util/ErrorHandler.h"

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>

namespace VisuFlow {
namespace Data {
namespace DB {

/**
 * @brief Repository for managing User data in the database.
 * Provides CRUD-like operations for User models.
 */
class UserRepository {
public:
    UserRepository();

    /**
     * @brief Finds a user by their ID.
     * @param userId The ID of the user.
     * @return User object if found, otherwise an uninitialized User (id=0).
     */
    Model::User findById(long long userId);

    /**
     * @brief Finds a user by their username.
     * @param username The username of the user.
     * @return User object if found, otherwise an uninitialized User (id=0).
     */
    Model::User findByUsername(const std::string& username);

    /**
     * @brief Creates a new user in the database.
     * @param username The username.
     * @param hashedPassword The hashed password.
     * @param email The user's email.
     * @param role The user's role.
     * @return The created User object with its assigned ID.
     */
    Model::User create(const std::string& username, const std::string& hashedPassword,
                      const std::string& email, const std::string& role);

    /**
     * @brief Updates an existing user's information.
     * @param user The User object containing updated information.
     * @return The updated User object.
     * @throws Util::APIException if user not found or update fails.
     */
    Model::User update(const Model::User& user);

    /**
     * @brief Deletes a user from the database.
     * @param userId The ID of the user to delete.
     * @throws Util::APIException if user not found or deletion fails.
     */
    void remove(long long userId);

private:
    // Helper to map pqxx::row to Model::User
    Model::User mapRowToUser(const pqxx::row& row);
};

} // namespace DB
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_USER_REPOSITORY_H
```