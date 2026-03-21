```cpp
#ifndef AUTH_SERVICE_H
#define AUTH_SERVICE_H

#include <string>
#include <optional>
#include "../models/User.h"
#include "../database/DatabaseManager.h"
#include "../utils/Hasher.h"
#include "../utils/JwtManager.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Services {

using namespace PaymentProcessor::Models;
using namespace PaymentProcessor::Database;
using namespace PaymentProcessor::Utils;
using namespace PaymentProcessor::Exceptions;

class AuthService {
public:
    explicit AuthService(DatabaseManager& dbManager) : dbManager(dbManager) {}

    // Registers a new user.
    User registerUser(const std::string& username, const std::string& password, const std::string& email, UserRole role);

    // Authenticates a user and returns a JWT token.
    std::string login(const std::string& username, const std::string& password);

    // Validates a JWT token.
    bool validateToken(const std::string& token);

    // Get user ID from token
    std::string getUserIdFromToken(const std::string& token);

    // Get user role from token
    std::string getUserRoleFromToken(const std::string& token);

private:
    DatabaseManager& dbManager;
};

} // namespace Services
} // namespace PaymentProcessor

#endif // AUTH_SERVICE_H
```