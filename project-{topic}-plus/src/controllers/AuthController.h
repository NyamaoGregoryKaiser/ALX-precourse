#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <crow.h>
#include "../services/UserService.h"
#include "../utils/JwtUtils.h"
#include "../config/AppConfig.h"

class AuthController {
public:
    AuthController();

    // Register API endpoint (POST /api/v1/auth/register)
    crow::response registerUser(const crow::request& req);

    // Login API endpoint (POST /api/v1/auth/login)
    crow::response loginUser(const crow::request& req);

private:
    UserService _user_service;
    const AppConfig& _app_config;

    // Helper to generate JWT token
    std::string generateAuthToken(const User& user);
};

#endif // AUTH_CONTROLLER_H