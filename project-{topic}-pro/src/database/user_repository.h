```cpp
#ifndef WEBSCRAPER_USER_REPOSITORY_H
#define WEBSCRAPER_USER_REPOSITORY_H

#include "base_repository.h"
#include "../models/user.h"
#include <optional>

class UserRepository : public BaseRepository {
public:
    std::optional<User> createUser(const std::string& username, const std::string& email, const std::string& passwordHash);
    std::optional<User> findById(const std::string& id);
    std::optional<User> findByUsername(const std::string& username);
    std::optional<User> findByEmail(const std::string& email);
    bool updateUser(const User& user);
    bool deleteUser(const std::string& id);
};

#endif // WEBSCRAPER_USER_REPOSITORY_H
```