```cpp
#ifndef DATAVIZ_USERREPOSITORY_H
#define DATAVIZ_USERREPOSITORY_H

#include <string>
#include <optional>
#include <memory>
#include "Database.h"
#include "../data/models/User.h"
#include "../utils/Logger.h"

class UserRepository {
private:
    std::shared_ptr<Database> db_;

public:
    explicit UserRepository(std::shared_ptr<Database> db);

    // Creates a new user in the database
    std::optional<User> create(const User& user);

    // Finds a user by ID
    std::optional<User> findById(int id);

    // Finds a user by email
    std::optional<User> findByEmail(const std::string& email);

    // Updates an existing user
    bool update(const User& user);

    // Deletes a user by ID
    bool remove(int id);
};

#endif // DATAVIZ_USERREPOSITORY_H
```