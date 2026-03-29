```cpp
#include "AuthController.hpp"

AuthController::AuthController(std::shared_ptr<AuthService> auth_service)
    : auth_service_(auth_service) {}

void AuthController::registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app) {
    CROW_ROUTE(app, "/api/v1/auth/register").methods(crow::HTTPMethod::POST)(
        [&](const crow::request& req) {
        return try_catch_handler([&]() -> crow::response {
            nlohmann::json req_body = JSONConverter::parse(req.body);
            UserRegisterDTO register_dto = UserRegisterDTO::fromJson(req_body);

            AuthResponseDTO response_dto = auth_service_->registerUser(register_dto);
            return crow::response(201, JSONConverter::toJSON(response_dto).dump());
        });
    });

    CROW_ROUTE(app, "/api/v1/auth/login").methods(crow::HTTPMethod::POST)(
        [&](const crow::request& req) {
        return try_catch_handler([&]() -> crow::response {
            nlohmann::json req_body = JSONConverter::parse(req.body);
            UserLoginDTO login_dto = UserLoginDTO::fromJson(req_body);

            AuthResponseDTO response_dto = auth_service_->loginUser(login_dto);
            return crow::response(200, JSONConverter::toJSON(response_dto).dump());
        });
    });
}
```