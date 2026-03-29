```cpp
#ifndef AUTH_SERVICE_HPP
#define AUTH_SERVICE_HPP

#include <memory>
#include <string>
#include <optional>
#include "../models/User.hpp"
#include "../database/DatabaseManager.hpp"
#include "../utils/JWTManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../models/DTOs.hpp" // For UserRegisterDTO, UserLoginDTO

// Forward declaration for password hashing utility
namespace PWDUtils {
    std::string hashPassword(const std::string& password);
    bool verifyPassword(const std::string& password, const std::string& hashed_password);
}

class AuthService {
public:
    AuthService(std::shared_ptr<DatabaseManager> db_manager, JWTManager& jwt_manager);

    AuthResponseDTO registerUser(const UserRegisterDTO& register_dto);
    AuthResponseDTO loginUser(const UserLoginDTO& login_dto);

private:
    std::shared_ptr<DatabaseManager> db_manager_;
    JWTManager& jwt_manager_;
};

#endif // AUTH_SERVICE_HPP
```