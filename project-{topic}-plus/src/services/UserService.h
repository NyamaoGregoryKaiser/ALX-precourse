```cpp
#ifndef USER_SERVICE_H
#define USER_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/User.h"
#include "../database/Database.h"
#include "../utils/Logger.h"
#include "../exceptions/CustomExceptions.h"
#include "../cache/Cache.h"

namespace TaskManager {
namespace Services {

class UserService {
public:
    UserService(Database::Database& db, Cache::Cache& cache);

    // CRUD Operations
    Models::User createUser(Models::User user);
    std::optional<Models::User> getUserById(long long id);
    std::optional<Models::User> getUserByUsername(const std::string& username);
    std::vector<Models::User> getAllUsers(int limit = 100, int offset = 0);
    Models::User updateUser(long long id, const Models::User& user_updates);
    void deleteUser(long long id);

    // Authentication-related (password handling)
    bool verifyUserPassword(const std::string& username, const std::string& plain_password);
    void changeUserPassword(long long id, const std::string& new_plain_password);

    // Authorization checks
    bool isAdmin(long long user_id);
    bool isOwner(long long user_id, long long resource_owner_id);

private:
    Database::Database& db_;
    Cache::Cache& cache_;

    std::optional<Models::User> mapRowToUser(const Database::Row& row);
    std::string generateCacheKey(long long userId);
    void invalidateUserCache(long long userId);
    void invalidateUserCache(const std::string& username);
};

} // namespace Services
} // namespace TaskManager

#endif // USER_SERVICE_H
```