```cpp
#include "UserController.h"

namespace TaskManager {
namespace Controllers {

UserController::UserController(Services::UserService& user_service)
    : user_service_(user_service) {}

void UserController::setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app) {
    // Get all users (Admin only)
    CROW_ROUTE(app, "/users")
        .methods("GET"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /users request.");

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }
            if (!ctx.is_admin) {
                throw Exceptions::ForbiddenException("Admin access required.");
            }

            int limit = req.url_params.get("limit") ? std::stoi(req.url_params.get("limit")) : 100;
            int offset = req.url_params.get("offset") ? std::stoi(req.url_params.get("offset")) : 0;

            std::vector<Models::User> users = user_service_.getAllUsers(limit, offset);
            
            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& user : users) {
                response_json.push_back(user.toJson());
            }

            crow::response res(crow::status::OK);
            res.set_header("Content-Type", "application/json");
            res.write(response_json.dump());
            logger->info("Fetched {} users.", users.size());
            return res;
        });

    // Get user by ID (Admin or self)
    CROW_ROUTE(app, "/users/<int>")
        .methods("GET"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int user_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received GET /users/{} request.", user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }
            if (!ctx.is_admin && ctx.user_id != user_id) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to view this user.");
            }

            std::optional<Models::User> user = user_service_.getUserById(user_id);
            if (!user) {
                throw Exceptions::NotFoundException("User not found with ID: " + std::to_string(user_id));
            }

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(user->toJson().dump());
            logger->info("Fetched user ID: {}.", user_id);
            return res;
        });

    // Update user by ID (Admin or self)
    CROW_ROUTE(app, "/users/<int>")
        .methods("PUT"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int user_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received PUT /users/{} request.", user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }
            if (!ctx.is_admin && ctx.user_id != user_id) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to update this user.");
            }

            auto json_body = nlohmann::json::parse(req.body);
            Models::User user_updates = Models::User::fromJson(json_body);

            // Prevent non-admins from changing roles or password hashes directly
            if (!ctx.is_admin) {
                if (json_body.contains("role") && user_updates.role != user_service_.getUserById(user_id)->role) {
                     throw Exceptions::ForbiddenException("Only administrators can change user roles.");
                }
                if (json_body.contains("password_hash")) {
                    throw Exceptions::BadRequestException("Cannot directly update password_hash. Use /users/{id}/change-password.");
                }
            } else {
                // Admins can change roles
                if (json_body.contains("role")) {
                    user_updates.role = Models::stringToUserRole(json_body["role"].get<std::string>());
                    if (user_updates.role == Models::UserRole::UNKNOWN) {
                        throw Exceptions::BadRequestException("Invalid user role provided.");
                    }
                }
            }
            
            // Apply updates
            Models::User updated_user = user_service_.updateUser(user_id, user_updates);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(updated_user.toJson().dump());
            logger->info("Updated user ID: {}.", user_id);
            return res;
        });
    
    // Change user password
    CROW_ROUTE(app, "/users/<int>/change-password")
        .methods("PUT"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int user_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received PUT /users/{}/change-password request.", user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }
            if (!ctx.is_admin && ctx.user_id != user_id) {
                throw Exceptions::ForbiddenException("Access denied. Not authorized to change this password.");
            }

            auto json_body = nlohmann::json::parse(req.body);
            if (!json_body.contains("new_password")) {
                throw Exceptions::BadRequestException("New password is required.");
            }

            std::string new_password = json_body["new_password"].get<std::string>();
            if (new_password.empty()) {
                throw Exceptions::ValidationException("New password cannot be empty.");
            }

            user_service_.changeUserPassword(user_id, new_password);

            res.code = crow::status::OK;
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"message", "Password updated successfully."}}.dump());
            logger->info("Password changed for user ID: {}.", user_id);
            return res;
        });


    // Delete user by ID (Admin only)
    CROW_ROUTE(app, "/users/<int>")
        .methods("DELETE"_method)
        ([this](const crow::request& req, crow::response& res, Middleware::AuthMiddleware::context& ctx, int user_id) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received DELETE /users/{} request.", user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required.");
            }
            if (!ctx.is_admin) {
                throw Exceptions::ForbiddenException("Admin access required.");
            }
            // An admin should not be able to delete themselves
            if (ctx.user_id == user_id) {
                throw Exceptions::ForbiddenException("An admin cannot delete their own account.");
            }

            user_service_.deleteUser(user_id);

            res.code = crow::status::NO_CONTENT;
            res.end();
            logger->info("Deleted user ID: {}.", user_id);
            return res;
        });
}

} // namespace Controllers
} // namespace TaskManager
```