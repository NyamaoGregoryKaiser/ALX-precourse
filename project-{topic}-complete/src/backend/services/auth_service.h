```cpp
#ifndef ECOMMERCE_AUTH_SERVICE_H
#define ECOMMERCE_AUTH_SERVICE_H

#include "../db/db_manager.h"
#include "../models/user.h"
#include "../utils/jwt_util.h"
#include "../middleware/error_middleware.h" // For custom exceptions
#include <string>
#include <utility> // For std::pair
#include <spdlog/spdlog.h>

class AuthService {
public:
    AuthService(DBManager& db_manager, const std::string& jwt_secret);

    User register_user(const std::string& username, const std::string& email, const std::string& password);
    std::pair<std::string, User> login_user(const std::string& email, const std::string& password);

private:
    DBManager& db_manager_;
    std::string jwt_secret_;
    std::shared_ptr<spdlog::logger> logger_;

    // Helper to generate a simple hash (for demonstration, not production-grade crypto)
    std::string hash_password(const std::string& password);
    bool verify_password(const std::string& password, const std::string& hashed_password);
};

#endif // ECOMMERCE_AUTH_SERVICE_H
```