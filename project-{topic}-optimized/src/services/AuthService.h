#pragma once

#include "repositories/UserRepository.h"
#include "models/User.h"
#include <string>
#include <optional>
#include <memory>

namespace services {

struct AuthResult {
    bool success;
    std::string token;
    std::string message;
    long long userId;
    std::string role;

    AuthResult() : success(false), userId(0) {}
};

class AuthService {
public:
    AuthService(std::shared_ptr<repositories::UserRepository> userRepo);

    AuthResult registerUser(const std::string& username, const std::string& email, const std::string& password);
    AuthResult loginUser(const std::string& usernameOrEmail, const std::string& password);

private:
    std::shared_ptr<repositories::UserRepository> userRepo_;
};

} // namespace services