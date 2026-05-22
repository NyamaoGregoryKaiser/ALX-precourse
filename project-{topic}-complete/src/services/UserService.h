```cpp
#pragma once

#include "models/User.h"
#include <string>
#include <optional>

class UserService {
public:
    // Registers a new user. Throws if username or email already exists.
    static User registerUser(const User& newUser, const std::string& plainPassword);

    // Authenticates a user. Returns the user object if successful, nullopt otherwise.
    static std::optional<User> authenticateUser(const std::string& username, const std::string& plainPassword);

    // Retrieves a user by their ID.
    static std::optional<User> getUserById(long userId);

    // Retrieves a user by username.
    static std::optional<User> getUserByUsername(const std::string& username);

    // Retrieves a user by email.
    static std::optional<User> getUserByEmail(const std::string& email);
};
```