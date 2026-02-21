```cpp
#ifndef USERCONTROLLER_H
#define USERCONTROLLER_H

#include <crow.h>
#include <string>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <memory>

#include "../services/UserService.h"
#include "../database/DbConnection.h"
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/JsonUtils.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext

class UserController {
public:
    UserController(std::function<std::shared_ptr<pqxx::connection>()> get_conn_func)
        : get_conn_from_pool(std::move(get_conn_func)) {}

    // Get user details (only own user for now)
    crow::response getUser(const crow::request& req, const std::string& userId_path) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string authenticated_user_id = ctx.auth_context.user_id;

        // Ensure user can only access their own profile
        if (userId_path != authenticated_user_id) {
            LOG_WARN("Unauthorized access attempt: User {} tried to access profile of {}.", authenticated_user_id, userId_path);
            throw ApiException(crow::FORBIDDEN, "Access denied. You can only view your own profile.");
        }

        try {
            auto conn = get_conn_from_pool();
            UserService userService(conn);
            std::optional<User> user = userService.get_user(authenticated_user_id);
            DbConnection::release_connection(conn);

            if (!user) {
                LOG_ERROR("Authenticated user {} not found in DB, despite JWT validation.", authenticated_user_id);
                throw ApiException(crow::NOT_FOUND, "User not found.");
            }

            return crow::response(crow::OK, user->to_json().dump());

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getUser for {}: {}", authenticated_user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update user details
    crow::response updateUser(const crow::request& req, const std::string& userId_path) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string authenticated_user_id = ctx.auth_context.user_id;

        if (userId_path != authenticated_user_id) {
            LOG_WARN("Unauthorized access attempt: User {} tried to update profile of {}.", authenticated_user_id, userId_path);
            throw ApiException(crow::FORBIDDEN, "Access denied. You can only update your own profile.");
        }

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::optional<std::string> username = JsonUtils::get_optional<std::string>(request_body, "username");
            std::optional<std::string> email = JsonUtils::get_optional<std::string>(request_body, "email");
            std::optional<std::string> password = JsonUtils::get_optional<std::string>(request_body, "password");

            auto conn = get_conn_from_pool();
            UserService userService(conn);
            User updated_user = userService.update_user(authenticated_user_id, username, email, password);
            DbConnection::release_connection(conn);

            return crow::response(crow::OK, updated_user.to_json().dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in updateUser: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in updateUser for {}: {}", authenticated_user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during user update.");
        }
    }

    // Delete user
    crow::response deleteUser(const crow::request& req, const std::string& userId_path) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string authenticated_user_id = ctx.auth_context.user_id;

        if (userId_path != authenticated_user_id) {
            LOG_WARN("Unauthorized access attempt: User {} tried to delete profile of {}.", authenticated_user_id, userId_path);
            throw ApiException(crow::FORBIDDEN, "Access denied. You can only delete your own profile.");
        }

        try {
            auto conn = get_conn_from_pool();
            UserService userService(conn);
            userService.delete_user(authenticated_user_id);
            DbConnection::release_connection(conn);

            return crow::response(crow::NO_CONTENT); // 204 No Content

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in deleteUser for {}: {}", authenticated_user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during user deletion.");
        }
    }

private:
    std::function<std::shared_ptr<pqxx::connection>()> get_conn_from_pool;
};

#endif // USERCONTROLLER_H
```