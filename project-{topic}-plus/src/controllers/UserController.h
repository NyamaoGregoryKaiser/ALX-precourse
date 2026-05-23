#ifndef USER_CONTROLLER_H
#define USER_CONTROLLER_H

#include <crow.h>
#include "../services/UserService.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext
#include "../utils/JsonUtils.h"

class UserController {
public:
    UserController();

    // Get all users (Admin only)
    crow::response getAllUsers(const crow::request& req, AuthContext& ctx);

    // Get user by ID (Authenticated user or Admin)
    crow::response getUserById(const crow::request& req, AuthContext& ctx, const std::string& user_id);

    // Update user (Owner or Admin)
    crow::response updateUser(const crow::request& req, AuthContext& ctx, const std::string& user_id);

    // Delete user (Admin only)
    crow::response deleteUser(const crow::request& req, AuthContext& ctx, const std::string& user_id);

private:
    UserService _user_service;
};

#endif // USER_CONTROLLER_H