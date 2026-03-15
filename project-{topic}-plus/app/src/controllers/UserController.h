#ifndef USER_CONTROLLER_H
#define USER_CONTROLLER_H

#include <crow.h>
#include "../services/UserService.h"
#include "../utils/Logger.h"
#include "../utils/ErrorHandler.h"
#include "../utils/Middleware.h" // For AuthMiddleware context and helpers
#include "../app_config.h"

class UserController {
private:
    UserService& user_service;

public:
    UserController(UserService& user_svc) : user_service(user_svc) {
        LOG_INFO("UserController initialized.");
    }

    /**
     * @brief Route to get the authenticated user's profile.
     * Requires authentication.
     * GET /users/me
     */
    void getMe(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
        try {
            require_auth(ctx); // Ensure the user is authenticated

            auto user_opt = user_service.getUserById(ctx.user_context.user_id);
            if (!user_opt) {
                // This shouldn't happen if JWT is valid and user_id is from token
                throw NotFoundException("Authenticated user not found.");
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(user_opt->to_json().dump());
        } catch (const AppException& e) {
            // ErrorHandlerMiddleware will catch and format this
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in getMe for user {}: {}", ctx.user_context.username, e.what());
            throw InternalServerException("Failed to retrieve user profile.");
        }
    }

    /**
     * @brief Route to get a user's profile by ID.
     * Requires ADMIN role.
     * GET /users/{id}
     */
    void getUserById(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
        try {
            require_role(ctx, AppConfig::ROLE_ADMIN); // Ensure user is ADMIN

            auto user_opt = user_service.getUserById(id);
            if (!user_opt) {
                throw NotFoundException("User not found.");
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(user_opt->to_json().dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in getUserById for id {}: {}", id, e.what());
            throw InternalServerException("Failed to retrieve user.");
        }
    }

    /**
     * @brief Route to update the authenticated user's profile.
     * Requires authentication.
     * PUT /users/me
     */
    void updateMe(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
        try {
            require_auth(ctx);

            auto json = crow::json::load(req.body);
            if (!json) {
                throw BadRequestException("Invalid JSON in request body.");
            }

            std::optional<std::string> email_opt;
            if (json.has("email")) {
                email_opt = json["email"].s();
                if (email_opt->empty()) throw BadRequestException("Email cannot be empty.");
                // Basic email format check
                if (email_opt->find('@') == std::string::npos || email_opt->find('.') == std::string::npos) {
                    throw BadRequestException("Invalid email format.");
                }
            }

            std::optional<std::string> password_opt;
            if (json.has("password")) {
                password_opt = json["password"].s();
                if (password_opt->empty() || password_opt->length() < 8) {
                    throw BadRequestException("Password must be at least 8 characters long.");
                }
            }
            
            // Note: Username/role cannot be updated by user himself.
            User updated_user = user_service.updateUser(ctx.user_context.user_id, email_opt, password_opt, std::nullopt);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            crow::json::wvalue resp_json;
            resp_json["message"] = "User profile updated successfully";
            resp_json["id"] = updated_user.id;
            resp_json["username"] = updated_user.username;
            resp_json["email"] = updated_user.email;
            resp_json["role"] = updated_user.role;
            resp_json["created_at"] = updated_user.created_at;
            resp_json["updated_at"] = updated_user.updated_at;
            res.write(resp_json.dump());
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in updateMe for user {}: {}", ctx.user_context.username, e.what());
            throw InternalServerException("Failed to update user profile.");
        }
    }

    /**
     * @brief Route to delete a user by ID.
     * Requires ADMIN role.
     * DELETE /users/{id}
     */
    void deleteUser(const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
        try {
            require_role(ctx, AppConfig::ROLE_ADMIN);

            if (user_service.deleteUser(id)) {
                res.code = crow::status::NO_CONTENT; // 204 No Content for successful deletion
            } else {
                throw NotFoundException("User not found or already deleted.");
            }
        } catch (const AppException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Error in deleteUser for id {}: {}", id, e.what());
            throw InternalServerException("Failed to delete user.");
        }
    }
};

#endif // USER_CONTROLLER_H