#include "UserController.h"
#include "../logger/Logger.h"
#include "../middleware/ErrorHandlingMiddleware.h"
#include <sstream>

UserController::UserController() : _user_service() {}

crow::response UserController::getAllUsers(const crow::request& req, AuthContext& ctx) {
    if (!AuthMiddleware::has_role(ctx, UserRole::ADMIN)) {
        return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: Admin role required.", 403, "FORBIDDEN").dump());
    }

    try {
        int limit = req.url_params.get("limit") ? std::stoi(req.url_params.get("limit")) : 100;
        int offset = req.url_params.get("offset") ? std::stoi(req.url_params.get("offset")) : 0;

        std::vector<User> users = _user_service.getAllUsers(limit, offset);
        nlohmann::json response_data;
        response_data["success"] = true;
        response_data["data"] = nlohmann::json::array();
        for (const auto& user : users) {
            response_data["data"].push_back(user.toJson());
        }
        return crow::response(200, response_data.dump());
    } catch (const std::invalid_argument& e) {
        return crow::response(400, ErrorHandlingMiddleware::create_error_response("Invalid limit or offset parameter.", 400, "BAD_REQUEST").dump());
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in UserController::getAllUsers: {}", e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}

crow::response UserController::getUserById(const crow::request& req, AuthContext& ctx, const std::string& user_id) {
    auto claims_opt = AuthMiddleware::get_claims(ctx);
    if (!claims_opt) { // Should be handled by AuthMiddleware, but defensive
        return crow::response(401, ErrorHandlingMiddleware::create_error_response("Authentication required.", 401, "UNAUTHORIZED").dump());
    }

    // Only allow access if it's the user's own profile or if the user is an Admin
    if (claims_opt->user_id != user_id && !AuthMiddleware::has_role(ctx, UserRole::ADMIN)) {
        return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: You can only view your own profile unless you are an Admin.", 403, "FORBIDDEN").dump());
    }

    try {
        std::optional<User> user = _user_service.getUserById(user_id);
        if (user) {
            nlohmann::json response_data;
            response_data["success"] = true;
            response_data["data"] = user->toJson();
            return crow::response(200, response_data.dump());
        } else {
            return crow::response(404, ErrorHandlingMiddleware::create_error_response("User not found.", 404, "NOT_FOUND").dump());
        }
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in UserController::getUserById ({}): {}", user_id, e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}

crow::response UserController::updateUser(const crow::request& req, AuthContext& ctx, const std::string& user_id) {
    auto claims_opt = AuthMiddleware::get_claims(ctx);
    if (!claims_opt) {
        return crow::response(401, ErrorHandlingMiddleware::create_error_response("Authentication required.", 401, "UNAUTHORIZED").dump());
    }

    // Authorization: User can update their own profile, or Admin can update any profile.
    // Also, Admins cannot demote themselves. Users cannot change their own role or other sensitive fields.
    bool is_admin = AuthMiddleware::has_role(ctx, UserRole::ADMIN);
    bool is_owner = (claims_opt->user_id == user_id);

    if (!is_owner && !is_admin) {
        return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: You can only update your own profile unless you are an Admin.", 403, "FORBIDDEN").dump());
    }

    try {
        nlohmann::json request_body = JsonUtils::parseJson(req.body);

        // Security: Prevent non-admin users from changing roles or other sensitive fields
        if (!is_admin) {
            if (request_body.contains("role") || request_body.contains("password_hash")) { // password_hash should never be sent
                return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: You do not have permission to update sensitive fields.", 403, "FORBIDDEN").dump());
            }
        }
        // Admin-specific logic for role changes: Prevent self-demotion
        if (is_admin && is_owner && request_body.contains("role")) {
            std::string requested_role_str = JsonUtils::getString(request_body, "role").value_or("");
            if (string_to_user_role(requested_role_str) != UserRole::ADMIN) {
                return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: Admin users cannot demote themselves.", 403, "FORBIDDEN").dump());
            }
        }

        std::optional<User> updatedUser = _user_service.updateUser(user_id, request_body);
        if (updatedUser) {
            nlohmann::json response_data;
            response_data["success"] = true;
            response_data["message"] = "User updated successfully.";
            response_data["data"] = updatedUser->toJson();
            return crow::response(200, response_data.dump());
        } else {
            return crow::response(404, ErrorHandlingMiddleware::create_error_response("User not found or update failed.", 404, "NOT_FOUND").dump());
        }
    } catch (const crow::json::error& e) {
        return crow::response(400, ErrorHandlingMiddleware::create_error_response("Invalid JSON format in request body.", 400, "BAD_REQUEST").dump());
    } catch (const UserServiceException& e) {
        throw; // Re-throw to be caught by global error handler
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in UserController::updateUser ({}): {}", user_id, e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}

crow::response UserController::deleteUser(const crow::request& req, AuthContext& ctx, const std::string& user_id) {
    if (!AuthMiddleware::has_role(ctx, UserRole::ADMIN)) {
        return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: Admin role required to delete users.", 403, "FORBIDDEN").dump());
    }

    // Prevent admin from deleting themselves
    auto claims_opt = AuthMiddleware::get_claims(ctx);
    if (claims_opt && claims_opt->user_id == user_id) {
        return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: You cannot delete your own admin account.", 403, "FORBIDDEN").dump());
    }

    try {
        if (_user_service.deleteUser(user_id)) {
            nlohmann::json response_data;
            response_data["success"] = true;
            response_data["message"] = "User deleted successfully.";
            return crow::response(200, response_data.dump());
        } else {
            return crow::response(404, ErrorHandlingMiddleware::create_error_response("User not found or deletion failed.", 404, "NOT_FOUND").dump());
        }
    } catch (const UserServiceException& e) {
        throw; // Re-throw to be caught by global error handler
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in UserController::deleteUser ({}): {}", user_id, e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}