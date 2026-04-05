```cpp
#ifndef AUTH_CONTROLLER_HPP
#define AUTH_CONTROLLER_HPP

#include "crow.h"
#include "../auth/AuthService.hpp"
#include "../services/UserService.hpp" // To fetch full user details

class AuthController {
public:
    AuthController(AuthService& authService, UserService& userService);

    // Handles user registration requests.
    crow::response registerUser(const crow::request& req);

    // Handles user login requests.
    crow::response loginUser(const crow::request& req);

private:
    AuthService& authService;
    UserService& userService;
};

#endif // AUTH_CONTROLLER_HPP
```