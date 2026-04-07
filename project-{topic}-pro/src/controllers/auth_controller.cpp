```cpp
#include "auth_controller.h"

AuthController::AuthController(UserService& userService) : userService(userService) {}

void AuthController::setupRoutes(Pistache::Rest::Router& router) {
    Pistache::Rest::Routes::Post(router, "/auth/register", Pistache::Rest::Routes::bind(&AuthController::registerUser, this));
    Pistache::Rest::Routes::Post(router, "/auth/login", Pistache::Rest::Routes::bind(&AuthController::loginUser, this));
    Logger::info("AuthController", "Auth routes setup.");
}

void AuthController::registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        nlohmann::json body = nlohmann::json::parse(request.body());
        std::string username = body.at("username").get<std::string>();
        std::string email = body.at("email").get<std::string>();
        std::string password = body.at("password").get<std::string>();

        auto [user, token] = userService.registerUser(username, email, password);

        nlohmann::json response_json;
        response_json["message"] = "User registered successfully";
        response_json["user"] = user->toJson();
        response_json["token"] = token;

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Created, response_json.dump());
        Logger::info("AuthController", "User registered: {}", username);

    } catch (const nlohmann::json::exception& e) {
        response.send(Http::Code::Bad_Request, BadRequestException("Invalid JSON payload or missing fields: " + std::string(e.what())).toJson().dump());
        Logger::warn("AuthController", "Bad request for registration: Invalid JSON. {}", e.what());
    } catch (const AppException& e) {
        response.send(e.getStatusCode(), e.toJson().dump());
    } catch (const std::exception& e) {
        response.send(Http::Code::Internal_Server_Error, AppException("An unexpected error occurred: " + std::string(e.what())).toJson().dump());
        Logger::error("AuthController", "Unexpected error during registration: {}", e.what());
    }
}

void AuthController::loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        nlohmann::json body = nlohmann::json::parse(request.body());
        std::string username = body.at("username").get<std::string>();
        std::string password = body.at("password").get<std::string>();

        std::string token = userService.loginUser(username, password);

        nlohmann::json response_json;
        response_json["message"] = "Login successful";
        response_json["token"] = token;

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, response_json.dump());
        Logger::info("AuthController", "User logged in: {}", username);

    } catch (const nlohmann::json::exception& e) {
        response.send(Http::Code::Bad_Request, BadRequestException("Invalid JSON payload or missing fields: " + std::string(e.what())).toJson().dump());
        Logger::warn("AuthController", "Bad request for login: Invalid JSON. {}", e.what());
    } catch (const AppException& e) {
        response.send(e.getStatusCode(), e.toJson().dump());
    } catch (const std::exception& e) {
        response.send(Http::Code::Internal_Server_Error, AppException("An unexpected error occurred: " + std::string(e.what())).toJson().dump());
        Logger::error("AuthController", "Unexpected error during login: {}", e.what());
    }
}
```