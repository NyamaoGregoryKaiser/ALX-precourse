```cpp
#include "AuthController.h"

namespace TaskManager {
namespace Controllers {

AuthController::AuthController(Services::AuthService& auth_service, Services::UserService& user_service)
    : auth_service_(auth_service), user_service_(user_service) {}

void AuthController::setupRoutes(crow::App<Middleware::ErrorHandlingMiddleware, Middleware::AuthMiddleware, Middleware::RateLimitingMiddleware>& app) {
    CROW_ROUTE(app, "/auth/login")
        .methods("POST"_method)
        ([this](const crow::request& req) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received /auth/login request.");

            auto json_body = nlohmann::json::parse(req.body);
            if (!json_body.contains("username") || !json_body.contains("password")) {
                throw Exceptions::BadRequestException("Username and password are required for login.");
            }

            std::string username = json_body["username"].get<std::string>();
            std::string password = json_body["password"].get<std::string>();

            auto auth_result = auth_service_.login(username, password);
            if (auth_result) {
                crow::response res(crow::status::OK);
                nlohmann::json response_json = {
                    {"message", "Login successful."},
                    {"user_id", auth_result->user_id},
                    {"username", auth_result->username},
                    {"role", auth_result->role},
                    {"token", auth_result->token}
                };
                res.set_header("Content-Type", "application/json");
                res.write(response_json.dump());
                logger->info("User '{}' logged in.", username);
                return res;
            } else {
                throw Exceptions::UnauthorizedException("Invalid username or password.");
            }
        });

    CROW_ROUTE(app, "/auth/register")
        .methods("POST"_method)
        ([this](const crow::request& req) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received /auth/register request.");

            auto json_body = nlohmann::json::parse(req.body);
            if (!json_body.contains("username") || !json_body.contains("password")) {
                throw Exceptions::BadRequestException("Username and password are required for registration.");
            }

            Models::User new_user;
            new_user.username = json_body["username"].get<std::string>();
            new_user.password_hash = json_body["password"].get<std::string>(); // This will be hashed by service
            if (json_body.contains("email")) {
                new_user.email = json_body["email"].get<std::string>();
            }
            // Default role is 'user', admin can be set by an admin
            
            Models::User created_user = user_service_.createUser(new_user);
            
            crow::response res(crow::status::CREATED);
            nlohmann::json response_json = {
                {"message", "User registered successfully."},
                {"user", created_user.toJson()}
            };
            res.set_header("Content-Type", "application/json");
            res.write(response_json.dump());
            logger->info("New user '{}' registered.", created_user.username);
            return res;
        });

    CROW_ROUTE(app, "/auth/me")
        .methods("GET"_method)
        ([this](const crow::request& req, Middleware::AuthMiddleware::context& ctx) {
            auto logger = Utils::Logger::getLogger();
            logger->info("Received /auth/me request from user ID: {}", ctx.user_id);

            if (!ctx.is_authenticated) {
                throw Exceptions::UnauthorizedException("Authentication required to access this resource.");
            }

            std::optional<Models::User> user = user_service_.getUserById(ctx.user_id);
            if (!user) {
                throw Exceptions::NotFoundException("Authenticated user not found.");
            }

            crow::response res(crow::status::OK);
            res.set_header("Content-Type", "application/json");
            res.write(user->toJson().dump()); // Don't send password hash
            return res;
        });
}

} // namespace Controllers
} // namespace TaskManager
```