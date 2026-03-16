```cpp
#include "auth_controller.h"

namespace mobile_backend {
namespace controllers {

crow::response AuthController::register_user(const crow::request& req) {
    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("Register: Bad JSON format: {}", e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    if (!json_body.has("username") || !json_body.has("email") || !json_body.has("password")) {
        throw utils::BadRequestException("Missing username, email, or password in request.");
    }

    std::string username = json_body["username"].s();
    std::string email = json_body["email"].s();
    std::string password = json_body["password"].s();

    try {
        models::User user = auth_service.register_user(username, email, password);
        crow::json::wvalue res_json;
        res_json["message"] = "User registered successfully";
        res_json["user"] = user.to_json();
        return crow::response(201, res_json);
    } catch (const services::AuthException& e) {
        throw utils::BadRequestException(e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Auth: Unexpected error during registration: {}", e.what());
        throw utils::InternalServerException("Failed to register user.");
    }
}

crow::response AuthController::login_user(const crow::request& req) {
    crow::json::rvalue json_body;
    try {
        json_body = crow::json::load(req.body);
    } catch (const std::runtime_error& e) {
        LOG_WARN("Login: Bad JSON format: {}", e.what());
        throw utils::BadRequestException("Invalid JSON format in request body.");
    }

    if (!json_body.has("identifier") || !json_body.has("password")) {
        throw utils::BadRequestException("Missing identifier (username/email) or password in request.");
    }

    std::string identifier = json_body["identifier"].s();
    std::string password = json_body["password"].s();

    try {
        std::string token = auth_service.login_user(identifier, password);
        crow::json::wvalue res_json;
        res_json["message"] = "Login successful";
        res_json["token"] = token;
        return crow::response(200, res_json);
    } catch (const services::AuthException& e) {
        throw utils::UnauthorizedException(e.what());
    } catch (const std::exception& e) {
        LOG_ERROR("Auth: Unexpected error during login: {}", e.what());
        throw utils::InternalServerException("Failed to log in.");
    }
}

} // namespace controllers
} // namespace mobile_backend
```