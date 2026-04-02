```cpp
#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <string>
#include <optional>
#include <json/json.hpp>
#include "UserService.h"
#include "../utils/JWTUtils.h"
#include "../config/AppConfig.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace TaskManager {
namespace Services {

struct AuthResult {
    long long user_id;
    std::string username;
    std::string role;
    std::string token;
};

class AuthService {
public:
    AuthService(UserService& user_service, Config::AppConfig& config);

    std::optional<AuthResult> login(const std::string& username, const std::string& password);
    long long authenticateToken(const std::string& token); // Returns user_id if token is valid, throws otherwise

private:
    UserService& user_service_;
    Config::AppConfig& config_;
};

} // namespace Services
} // namespace TaskManager

#endif // AUTH_SERVICE_H
```