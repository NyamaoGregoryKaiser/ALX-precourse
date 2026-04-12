#include "auth_controller.h"

AuthController::AuthController(AuthService& auth_service)
    : auth_service_(auth_service) {
    LOG_INFO("AuthController initialized.");
}

Pistache::Rest::RouteCallback AuthController::register_user() {
    return Pistache::Rest::Routes::Post([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        // Parse request body as JSON
        std::optional<Json::Value> json_body = JsonUtil::parse_json(request.body());
        if (!json_body) {
            throw BadRequestException("Invalid JSON in request body.");
        }

        // Validate required fields
        if (!JsonUtil::has_required_fields(*json_body, {"username", "password"})) {
            throw BadRequestException("Missing required fields: username, password.");
        }

        std::string username = JsonUtil::get_string(*json_body, "username");
        std::string password = JsonUtil::get_string(*json_body, "password");
        std::string role_str = JsonUtil::get_string(*json_body, "role", "user"); // Default to 'user'

        try {
            UserRole role = string_to_user_role(role_str);
            std::optional<User> new_user = auth_service_.register_user(username, password, role);

            if (new_user) {
                Json::Value response_json;
                response_json["status"] = "success";
                response_json["message"] = "User registered successfully.";
                response_json["user"] = new_user->to_json();

                response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                response.send(Pistache::Http::Code::Created, JsonUtil::to_string(response_json)).get();
            } else {
                throw InternalServerException("Failed to register user due to an unknown error.");
            }
        } catch (const ApiException& e) {
            throw; // Re-throw to be caught by ErrorHandler middleware
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user registration: " + std::string(e.what()));
            throw InternalServerException("Failed to register user.");
        }
    });
}

Pistache::Rest::RouteCallback AuthController::login_user() {
    return Pistache::Rest::Routes::Post([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        // Parse request body as JSON
        std::optional<Json::Value> json_body = JsonUtil::parse_json(request.body());
        if (!json_body) {
            throw BadRequestException("Invalid JSON in request body.");
        }

        // Validate required fields
        if (!JsonUtil::has_required_fields(*json_body, {"username", "password"})) {
            throw BadRequestException("Missing required fields: username, password.");
        }

        std::string username = JsonUtil::get_string(*json_body, "username");
        std::string password = JsonUtil::get_string(*json_body, "password");

        try {
            std::optional<std::string> token = auth_service_.login_user(username, password);

            if (token) {
                Json::Value response_json;
                response_json["status"] = "success";
                response_json["message"] = "Login successful.";
                response_json["token"] = *token;
                response_json["expires_in"] = Config::JWT_EXPIRATION_SECONDS;

                response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::MediaType("application/json"));
                response.send(Pistache::Http::Code::Ok, JsonUtil::to_string(response_json)).get();
            } else {
                throw UnauthorizedException("Invalid credentials.");
            }
        } catch (const ApiException& e) {
            throw; // Re-throw to be caught by ErrorHandler middleware
        } catch (const std::exception& e) {
            LOG_ERROR("Error during user login: " + std::string(e.what()));
            throw InternalServerException("Failed to login user.");
        }
    });
}
```