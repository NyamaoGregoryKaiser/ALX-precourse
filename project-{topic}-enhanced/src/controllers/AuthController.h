#pragma once

#include "crow.h"
#include "services/AuthService.h"
#include "utils/Logger.h"
#include "config/AppConfig.h"

class AuthController {
public:
    static void register_routes(crow::App<
            crow::AuthMiddleware,
            crow::ErrorMiddleware,
            crow::RateLimitMiddleware
        >& app, AuthService& auth_service) {

        CROW_ROUTE(app, "/api/auth/register").methods("POST"_method)(
            [&auth_service](const crow::request& req) {
                crow::json::rvalue req_body = crow::json::load(req.body);
                if (!req_body) {
                    return crow::response(400, "{\"error\":\"Invalid JSON body.\"}");
                }

                std::string username = req_body["username"].s();
                std::string email = req_body["email"].s();
                std::string password = req_body["password"].s();

                if (username.empty() || email.empty() || password.empty()) {
                    return crow::response(400, "{\"error\":\"Username, email, and password are required.\"}");
                }

                auto new_user_opt = auth_service.register_user(username, email, password);
                if (new_user_opt) {
                    crow::json::wvalue res_body;
                    res_body["message"] = "User registered successfully.";
                    res_body["user"]["id"] = new_user_opt->id;
                    res_body["user"]["username"] = new_user_opt->username;
                    res_body["user"]["email"] = new_user_opt->email;
                    return crow::response(201, res_body);
                } else {
                    return crow::response(409, "{\"error\":\"Username or email already exists.\"}");
                }
            });

        CROW_ROUTE(app, "/api/auth/login").methods("POST"_method)(
            [&auth_service](const crow::request& req) {
                crow::json::rvalue req_body = crow::json::load(req.body);
                if (!req_body) {
                    return crow::response(400, "{\"error\":\"Invalid JSON body.\"}");
                }

                std::string username = req_body["username"].s();
                std::string password = req_body["password"].s();

                if (username.empty() || password.empty()) {
                    return crow::response(400, "{\"error\":\"Username and password are required.\"}");
                }

                auto token_opt = auth_service.login_user(username, password, AppConfig::get_instance().get_jwt_secret());
                if (token_opt) {
                    crow::json::wvalue res_body;
                    res_body["message"] = "Login successful.";
                    res_body["token"] = token_opt.value();
                    return crow::response(200, res_body);
                } else {
                    return crow::response(401, "{\"error\":\"Invalid credentials.\"}");
                }
            });
    }
};