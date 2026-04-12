#pragma once

#include "models/User.h"
#include "database/DatabaseManager.h"
#include "soci/row.h"
#include <optional>
#include <stdexcept>
#include <string>

class UserRepository {
public:
    // Creates a new user in the database
    std::optional<User> create_user(const User& user);

    // Finds a user by ID
    std::optional<User> find_by_id(int id);

    // Finds a user by username
    std::optional<User> find_by_username(const std::string& username);

    // Updates an existing user
    bool update_user(const User& user);

    // Deletes a user by ID
    bool delete_user(int id);

private:
    User row_to_user(const soci::row& r);
};