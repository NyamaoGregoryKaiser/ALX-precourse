```cpp
#ifndef USER_SERVICE_HPP
#define USER_SERVICE_HPP

#include <memory>
#include <string>
#include <vector>
#include <optional>
#include "../models/User.hpp"
#include "../database/DatabaseManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../models/DTOs.hpp" // For UserUpdateDTO

// Forward declaration for password hashing utility
namespace PWDUtils {
    std::string hashPassword(const std::string& password);
}

class UserService {
public:
    UserService(std::shared_ptr<DatabaseManager> db_manager);

    std::optional<User> getUserById(int id);
    std::vector<User> getAllUsers();
    User updateUser(int id, const UserUpdateDTO& user_dto);
    bool deleteUser(int id);
    User createUser(const UserRegisterDTO& register_dto, UserRole role = UserRole::USER); // Admin can create users directly

private:
    std::shared_ptr<DatabaseManager> db_manager_;
};

#endif // USER_SERVICE_HPP
```