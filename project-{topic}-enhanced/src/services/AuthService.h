#pragma once

#include <string>
#include <optional>
#include <map>
#include <memory>

class UserRepository; // Forward declaration
class User;           // Forward declaration

class AuthService {
public:
    AuthService(const std::string& jwt_secret);

    std::optional<std::string> login(const std::string& username, const std::string& password, UserRepository& userRepo);
    std::map<std::string, std::string> verifyToken(const std::string& token);
    std::string generateToken(const User& user);

    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& hashed_password);

private:
    std::string jwt_secret_;
};
```