#include "AuthController.h"
#include "../logger/Logger.h"
#include "../middleware/ErrorHandlingMiddleware.h" // For error response helper
#include "../utils/JsonUtils.h"

AuthController::AuthController() : _user_service(), _app_config(AppConfig::get_instance()) {}

std::string AuthController::generateAuthToken(const User& user) {
    JwtUtils::Claims claims;
    claims.user_id = user.id;
    claims.role = user_role_to_string(user.role);
    claims.exp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count() + _app_config.jwt_expiry_seconds;

    return JwtUtils::encode(claims, _app_config.jwt_secret);
}

crow::response AuthController::registerUser(const crow::request& req) {
    try {
        nlohmann::json request_body = JsonUtils::parseJson(req.body);

        // FromJson returns a User object template without hashed password
        User newUserTemplate = User::fromJson(request_body);
        std::string rawPassword = JsonUtils::getString(request_body, "password").value();

        std::optional<User> registeredUser = _user_service.registerUser(newUserTemplate, rawPassword);

        if (registeredUser) {
            nlohmann::json response_data;
            response_data["success"] = true;
            response_data["message"] = "User registered successfully.";
            response_data["user"] = registeredUser->toJson();
            response_data["token"] = generateAuthToken(*registeredUser); // Generate token on registration

            return crow::response(201, response_data.dump()); // 201 Created
        } else {
            return crow::response(500, ErrorHandlingMiddleware::create_error_response("Failed to register user.", 500, "REGISTRATION_FAILED").dump());
        }
    } catch (const crow::json::error& e) {
        // Handled by global error middleware, but good to catch here too for specific responses
        return crow::response(400, ErrorHandlingMiddleware::create_error_response("Invalid JSON format in request body.", 400, "BAD_REQUEST").dump());
    } catch (const UserServiceException& e) {
        // Service layer exceptions are mapped to HTTP status codes by middleware
        throw; // Re-throw to be caught by global error handler
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in AuthController::registerUser: {}", e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}

crow::response AuthController::loginUser(const crow::request& req) {
    try {
        nlohmann::json request_body = JsonUtils::parseJson(req.body);

        std::vector<std::string> required_keys = {"username_or_email", "password"};
        if (!JsonUtils::containsAllKeys(request_body, required_keys)) {
            return crow::response(400, ErrorHandlingMiddleware::create_error_response("Missing required fields for login.", 400, "BAD_REQUEST").dump());
        }

        std::string username_or_email = JsonUtils::getString(request_body, "username_or_email").value();
        std::string password = JsonUtils::getString(request_body, "password").value();

        std::optional<User> user = _user_service.authenticateUser(username_or_email, password);

        if (user) {
            nlohmann::json response_data;
            response_data["success"] = true;
            response_data["message"] = "Login successful.";
            response_data["user"] = user->toJson();
            response_data["token"] = generateAuthToken(*user);

            return crow::response(200, response_data.dump());
        } else {
            // This path should ideally not be reached if authenticateUser throws InvalidCredentialsException
            return crow::response(401, ErrorHandlingMiddleware::create_error_response("Invalid credentials.", 401, "UNAUTHORIZED").dump());
        }
    } catch (const crow::json::error& e) {
        return crow::response(400, ErrorHandlingMiddleware::create_error_response("Invalid JSON format in request body.", 400, "BAD_REQUEST").dump());
    } catch (const UserServiceException& e) {
        throw; // Re-throw to be caught by global error handler
    } catch (const std::exception& e) {
        Logger::get_logger()->error("Exception in AuthController::loginUser: {}", e.what());
        return crow::response(500, ErrorHandlingMiddleware::create_error_response("An unexpected server error occurred.", 500, "SERVER_ERROR").dump());
    }
}