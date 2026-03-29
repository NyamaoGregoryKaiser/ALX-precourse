```cpp
#include "UserController.hpp"

UserController::UserController(std::shared_ptr<UserService> user_service)
    : user_service_(user_service) {}

void UserController::registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app) {
    // Get all users (Admin only)
    CROW_ROUTE(app, "/api/v1/users")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx) {
        return try_catch_handler([&]() -> crow::response {
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                throw ForbiddenException("Access denied: Admins only.");
            }
            std::vector<User> users = user_service_->getAllUsers();
            return crow::response(200, JSONConverter::toJSON(users).dump());
        });
    });

    // Create user (Admin only)
    CROW_ROUTE(app, "/api/v1/users")
        .methods(crow::HTTPMethod::POST)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx) {
        return try_catch_handler([&]() -> crow::response {
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                throw ForbiddenException("Access denied: Admins only.");
            }
            nlohmann::json req_body = JSONConverter::parse(req.body);
            UserRegisterDTO register_dto = UserRegisterDTO::fromJson(req_body);
            UserRole role_to_create = UserRole::USER;
            if (req_body.contains("role")) {
                std::string role_str = req_body.at("role").get<std::string>();
                std::transform(role_str.begin(), role_str.end(), role_str.begin(), ::toupper);
                if (role_str == "ADMIN") role_to_create = UserRole::ADMIN;
                else if (role_str != "USER") throw BadRequestException("Invalid role specified for new user.");
            }
            User new_user = user_service_->createUser(register_dto, role_to_create);
            return crow::response(201, JSONConverter::toJSON(new_user).dump());
        });
    });


    // Get user by ID (Admin or self)
    CROW_ROUTE(app, "/api/v1/users/<int>")
        .methods(crow::HTTPMethod::GET)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, crow::response& res, AuthContext& ctx, int user_id) {
        return try_catch_handler([&]() -> crow::response {
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN) && ctx.user_id != user_id) {
                throw ForbiddenException("Access denied: Cannot view other users' profiles.");
            }
            std::optional<User> user = user_service_->getUserById(user_id);
            if (!user.has_value()) {
                throw NotFoundException("User with ID " + std::to_string(user_id) + " not found.");
            }
            return crow::response(200, JSONConverter::toJSON(user.value()).dump());
        });
    });

    // Update user by ID (Admin or self)
    CROW_ROUTE(app, "/api/v1/users/<int>")
        .methods(crow::HTTPMethod::PUT)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int user_id) {
        return try_catch_handler([&]() -> crow::response {
            // A user can update their own profile. Admin can update any profile.
            // If a user tries to change their role, it requires admin privileges.
            bool is_admin = AuthMiddleware::hasRole(ctx, UserRole::ADMIN);
            if (!is_admin && ctx.user_id != user_id) {
                throw ForbiddenException("Access denied: Cannot update other users' profiles.");
            }

            nlohmann::json req_body = JSONConverter::parse(req.body);
            UserUpdateDTO update_dto = UserUpdateDTO::fromJson(req_body);

            // Prevent non-admin users from changing their role
            if (!is_admin && update_dto.role.has_value()) {
                throw ForbiddenException("Access denied: Only administrators can change user roles.");
            }

            User updated_user = user_service_->updateUser(user_id, update_dto);
            return crow::response(200, JSONConverter::toJSON(updated_user).dump());
        });
    });

    // Delete user by ID (Admin only)
    CROW_ROUTE(app, "/api/v1/users/<int>")
        .methods(crow::HTTPMethod::DELETE)
        (app.get_middleware<AuthMiddleware>(), [&](const crow::request& req, AuthContext& ctx, int user_id) {
        return try_catch_handler([&]() -> crow::response {
            if (!AuthMiddleware::hasRole(ctx, UserRole::ADMIN)) {
                throw ForbiddenException("Access denied: Admins only.");
            }
            user_service_->deleteUser(user_id);
            return crow::response(204); // No content
        });
    });
}
```