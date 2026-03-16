```cpp
#ifndef MOBILE_BACKEND_USER_SERVICE_H
#define MOBILE_BACKEND_USER_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include <stdexcept>
#include "../models/user.h"
#include "../utils/database.h"
#include "../utils/logger.h"
#include "../utils/cache.h"
#include "../services/auth_service.h" // For password hashing

namespace mobile_backend {
namespace services {

class UserServiceException : public std::runtime_error {
public:
    explicit UserServiceException(const std::string& message) : std::runtime_error(message) {}
};

class UserService {
public:
    UserService(utils::Database& db_instance, utils::Cache<models::User>& user_cache_instance);

    // Get a user by ID
    std::optional<models::User> get_user_by_id(int user_id);

    // Get a user by username
    std::optional<models::User> get_user_by_username(const std::string& username);

    // Update a user's details (username, email). Password update is separate.
    models::User update_user(int user_id, const std::optional<std::string>& new_username,
                             const std::optional<std::string>& new_email);

    // Update user password
    void update_user_password(int user_id, const std::string& new_password);

    // Delete a user
    void delete_user(int user_id);

private:
    utils::Database& db;
    utils::Cache<models::User>& user_cache;
};

} // namespace services
} // namespace mobile_backend

#endif // MOBILE_BACKEND_USER_SERVICE_H
```