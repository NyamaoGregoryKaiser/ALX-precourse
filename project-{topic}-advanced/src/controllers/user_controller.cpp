```cpp
#include "user_controller.h"

namespace mobile_backend {
namespace controllers {

crow::response UserController::get_user_profile(const crow::request& req, crow::response& res,
                                                const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    try {
        std::optional<models::User> user = user_service.get_user_by_id(*ctx.user_id);
        if (!user) {
            throw utils::NotFoundException("User not found.");
        }

        crow::json::wvalue res_json;
        res_json["message"] = "User profile retrieved successfully.";
        res_json["user"] = user->to_json();
        return crow::response(200, res_json);

    } catch (const services::UserServiceException& e) {
        throw utils::InternalServerException(e.what()); // If service-level error occurs
    } catch (const utils::AppException& e) { // Re-throw custom app exceptions
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("User: Unexpected error getting user profile (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to retrieve user profile.");
    }
}

crow::response UserController::update_user_profile(const crow::request& req, crow::response& res,
                                                   const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("User: Bad JSON format for update profile (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    std::optional<std::string> new_username;
    if (json_body.has("username")) {
        new_username = json_body["username"].s();
    }

    std::optional<std::string> new_email;
    if (json_body.has("email")) {
        new_email = json_body["email"].s();
    }

    if (!new_username && !new_email) {
        throw utils::BadRequestException("No valid fields provided for update (username or email required).");
    }

    try {
        models::User updated_user = user_service.update_user(*ctx.user_id, new_username, new_email);
        crow::json::wvalue res_json;
        res_json["message"] = "User profile updated successfully.";
        res_json["user"] = updated_user.to_json();
        return crow::response(200, res_json);
    } catch (const services::UserServiceException& e) {
        throw utils::BadRequestException(e.what()); // e.g., username/email taken
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("User: Unexpected error updating user profile (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to update user profile.");
    }
}

crow::response UserController::update_user_password(const crow::request& req, crow::response& res,
                                                    const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("User: Bad JSON format for update password (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    if (!json_body.has("new_password")) {
        throw utils::BadRequestException("Missing 'new_password' in request.");
    }

    std::string new_password = json_body["new_password"].s();

    try {
        user_service.update_user_password(*ctx.user_id, new_password);
        crow::json::wvalue res_json;
        res_json["message"] = "Password updated successfully.";
        return crow::response(200, res_json);
    } catch (const services::UserServiceException& e) {
        throw utils::BadRequestException(e.what());
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("User: Unexpected error updating password (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to update password.");
    }
}

crow::response UserController::delete_user_account(const crow::request& req, crow::response& res,
                                                   const utils::AuthMiddleware::context& ctx) {
    if (!ctx.user_id) {
        throw utils::UnauthorizedException("Authentication context missing user ID.");
    }

    try {
        user_service.delete_user(*ctx.user_id);
        crow::json::wvalue res_json;
        res_json["message"] = "User account deleted successfully.";
        return crow::response(200, res_json);
    } catch (const services::UserServiceException& e) {
        throw utils::NotFoundException(e.what()); // e.g., User not found
    } catch (const utils::AppException& e) {
        throw;
    } catch (const std::exception& e) {
        LOG_ERROR("User: Unexpected error deleting user account (ID: {}): {}", *ctx.user_id, e.what());
        throw utils::InternalServerException("Failed to delete user account.");
    }
}

} // namespace controllers
} // namespace mobile_backend
```