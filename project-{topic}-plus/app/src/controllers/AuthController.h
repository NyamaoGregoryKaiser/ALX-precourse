#ifndef AUTH_CONTROLLER_H
#define AUTH_CONTROLLER_H

#include <crow.h>
#include "../services/AuthService.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"
#include "../app_config.h"

class AuthController {
private:
    AuthService& auth_service;

public:
    AuthController(AuthService& auth_svc) : auth_service(auth_svc) {
        LOG_INFO("AuthController initialized.");
    }

    /**
     * @brief Route for user registration.
     * POST /auth/register
     */
    void registerUser(const crow::request& req, crow::response& res) {
        try {
            auto json = crow::json::load(req.body);
            if (!json) {
                throw BadRequestException("Invalid JSON in request body.");
            }

            // Basic input validation
            if (!json.has("username") || !json.has("email") || !json.has("password") ||
                json["username"].s().empty() || json["email"].s().empty() || json["password"].s().empty()) {
                throw BadRequestException("Username, email, and password are required.");
            }

            std::string username = json["username"].s();
            std::string email = json["email"].s();
            std::string password = json["password"].s();
            std::string role = json.has("role") ? json["role"].s() : AppConfig::ROLE_USER;

            // Validate email format
            if (email.find('@') == std::string::npos || email.find('.') == std::string::npos) {
                throw BadRequestException("Invalid email format.");
            }

            // Ensure role is valid
            if (role != AppConfig::ROLE_USER && role != AppConfig::ROLE_ADMIN) {
                throw BadRequestException("Invalid user role specified.");
            }

            // Delegating to AuthService
            auto [new_user, token] = auth_service.registerUser(username, email, password, role);

            res.code = crow::status::CREATED; // 201 Created
            res.set_header("Content-Type", "application/json");
            crow::json::wvalue resp_json;
            resp_json["message"] = "User registered successfully";
            resp_json["user_id"] = new_user.id;
            resp_json["username"] = new_user.username;
            resp_json["email"] = new_user.email;
            resp_json["role"] = new_user.role;
            resp_json["token"] = token;
            res.write(resp_json.dump());

        } catch (const AppException& e) {
            // ErrorHandlerMiddleware will catch and format this
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in registerUser: {}", e.what());
            throw InternalServerException("Failed to register user.");
        }
    }

    /**
     * @brief Route for user login.
     * POST /auth/login
     */
    void loginUser(const crow::request& req, crow::response& res) {
        try {
            auto json = crow::json::load(req.body);
            if (!json) {
                throw BadRequestException("Invalid JSON in request body.");
            }

            if (!json.has("username") || !json.has("password") ||
                json["username"].s().empty() || json["password"].s().empty()) {
                throw BadRequestException("Username and password are required.");
            }

            std::string username = json["username"].s();
            std::string password = json["password"].s();

            // Delegating to AuthService
            auto [user, token] = auth_service.loginUser(username, password);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            crow::json::wvalue resp_json;
            resp_json["message"] = "Login successful";
            resp_json["token"] = token;
            resp_json["user_id"] = user.id;
            resp_json["username"] = user.username;
            resp_json["role"] = user.role;
            res.write(resp_json.dump());

        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in loginUser: {}", e.what());
            throw InternalServerException("Failed to log in.");
        }
    }
};

#endif // AUTH_CONTROLLER_H