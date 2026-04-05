```cpp
#ifndef AUTH_SERVICE_HPP
#define AUTH_SERVICE_HPP

#include "JwtManager.hpp"
#include "../database/Database.hpp"
#include "../models/User.hpp"

#include <string>
#include <memory>

class AuthService {
public:
    AuthService(Database& db, JwtManager& jwtManager);

    // Registers a new user with the given credentials and role.
    // Throws std::runtime_error if registration fails (e.g., username/email taken).
    User registerUser(const std::string& username, const std::string& password, const std::string& email, const std::string& role = "user");

    // Authenticates a user with username and password.
    // Returns a JWT on success. Throws std::runtime_error on failure.
    // userId and userRole are output parameters to return authenticated user's ID and role.
    std::string loginUser(const std::string& username, const std::string& password, int& userId, std::string& userRole);

    // Validates a JWT token. Returns true if valid, false otherwise.
    bool validateToken(const std::string& token);

private:
    Database& db;
    JwtManager& jwtManager;
};

#endif // AUTH_SERVICE_HPP
```