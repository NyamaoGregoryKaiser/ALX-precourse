#pragma once

#include "repositories/UserRepository.h"
#include "models/User.h"
#include <string>
#include <optional>
#include <vector>
#include <memory>

namespace services {

class UserService {
public:
    UserService(std::shared_ptr<repositories::UserRepository> userRepo);

    std::optional<models::User> getUserById(long long userId);
    std::vector<models::User> getAllUsers(); // Admin only
    bool updateUser(long long userId, const std::string& newUsername, const std::string& newEmail, const std::string& newRole);
    bool deleteUser(long long userId);

private:
    std::shared_ptr<repositories::UserRepository> userRepo_;
};

} // namespace services