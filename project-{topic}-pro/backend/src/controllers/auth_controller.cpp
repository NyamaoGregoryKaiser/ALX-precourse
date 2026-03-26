#include "auth_controller.h"
#include "../core/middleware.h" // For ApiException
#include "spdlog/spdlog.h"

void AuthController::setup_routes(CMS_Server& server) {
    server.add_route(Pistache::Http::Method::Post, "/auth/register", Pistache::Rest::Route::bind(&AuthController::handle_register, this));
    server.add_route(Pistache::Http::Method::Post, "/auth/login", Pistache::Rest::Route::bind(&AuthController::handle_login, this));
    spdlog::info("Auth routes configured.");
}

void AuthController::handle_register(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    auto json_body = parse_json_body(request);
    
    UserCreateDTO create_dto;
    try {
        create_dto.username = json_body.at("username").get<std::string>();
        create_dto.email = json_body.at("email").get<std::string>();
        create_dto.password = json_body.at("password").get<std::string>();
        if (json_body.count("role")) {
            create_dto.role = json_body.at("role").get<std::string>();
        }
    } catch (const nlohmann::json::exception& e) {
        throw ApiException(Pistache::Http::Code::Bad_Request, "Missing or invalid fields in request body", e.what());
    }

    try {
        auto user_dto = user_service.register_user(create_dto);
        if (user_dto) {
            nlohmann::json resp_json = {
                {"id", user_dto->id},
                {"username", user_dto->username},
                {"email", user_dto->email},
                {"role", user_dto->role}
            };
            response.send(Pistache::Http::Code::Created, resp_json.dump());
        } else {
            throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Failed to register user");
        }
    } catch (const ApiException& e) {
        throw; // Re-throw to be caught by ErrorHandlingMiddleware
    } catch (const std::exception& e) {
        throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Registration failed", e.what());
    }
}

void AuthController::handle_login(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    auto json_body = parse_json_body(request);

    std::string email, password;
    try {
        email = json_body.at("email").get<std::string>();
        password = json_body.at("password").get<std::string>();
    } catch (const nlohmann::json::exception& e) {
        throw ApiException(Pistache::Http::Code::Bad_Request, "Missing email or password", e.what());
    }

    try {
        if (auto user = user_service.validate_credentials(email, password)) {
            std::string token = jwt_manager.generate_token(user->id.value(), user->username, User::role_to_string(user->role));
            nlohmann::json resp_json = {
                {"token", token},
                {"userId", user->id.value()},
                {"username", user->username},
                {"role", User::role_to_string(user->role)}
            };
            response.send(Pistache::Http::Code::Ok, resp_json.dump());
        } else {
            throw ApiException(Pistache::Http::Code::Unauthorized, "Invalid credentials");
        }
    } catch (const ApiException& e) {
        throw;
    } catch (const std::exception& e) {
        throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Login failed", e.what());
    }
}