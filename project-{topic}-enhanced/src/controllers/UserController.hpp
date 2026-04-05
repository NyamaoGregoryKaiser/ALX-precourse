```cpp
#ifndef USER_CONTROLLER_HPP
#define USER_CONTROLLER_HPP

#include "crow.h"
#include "../services/UserService.hpp"

class UserController {
public:
    UserController(UserService& userService);

    // Handles retrieving the authenticated user's profile.
    crow::response getAuthenticatedUser(const crow::request& req);

    // Handles updating the authenticated user's profile.
    crow::response updateAuthenticatedUser(const crow::request& req);

    // Handles deleting the authenticated user's account.
    crow::response deleteAuthenticatedUser(const crow::request& req);

    // Handles retrieving a list of all users (admin only).
    crow::response getAllUsers(const crow::request& req);

private:
    UserService& userService;
};

#endif // USER_CONTROLLER_HPP
```