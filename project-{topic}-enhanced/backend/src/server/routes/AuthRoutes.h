```cpp
#ifndef DATAVIZ_AUTHROUTES_H
#define DATAVIZ_AUTHROUTES_H

#include <crow.h>
#include <memory>
#include "../../db/UserRepository.h"
#include "../utils/JsonUtils.h"
#include "../../utils/Crypto.h"
#include "../utils/TokenManager.h"
#include "../../config/Config.h"
#include "../../utils/Logger.h"

class AuthRoutes {
public:
    template <typename App>
    static void setupPublicRoutes(App& app, std::shared_ptr<UserRepository> user_repo);
};

// Template implementation must be in header or included source, due to C++ template rules.
template <typename App>
void AuthRoutes::setupPublicRoutes(App& app, std::shared_ptr<UserRepository> user_repo) {

    // Register a new user
    CROW_ROUTE(app, "/api/auth/register")
        .methods("POST"_method)
        ([user_repo](const crow::request& req) {
            crow::response res;
            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return res;
            }

            if (!req_body.contains("email") || !req_body.contains("password")) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Email and password are required.", 400).dump());
                return res;
            }

            std::string email = req_body["email"].get<std::string>();
            std::string password = req_body["password"].get<std::string>();

            // Basic email validation
            if (email.find('@') == std::string::npos || email.length() < 5) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Invalid email format.", 400).dump());
                return res;
            }

            // Password strength validation (example)
            if (password.length() < 8) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Password must be at least 8 characters long.", 400).dump());
                return res;
            }

            if (user_repo->findByEmail(email)) {
                res.code = 409; // Conflict
                res.write(JsonUtils::createErrorResponse("User with this email already exists.", 409).dump());
                return res;
            }

            std::string hashedPassword = Crypto::hashPassword(password);
            User new_user(email, hashedPassword, "user"); // Default role "user"

            if (auto created_user = user_repo->create(new_user)) {
                res.code = 201;
                res.write(JsonUtils::createSuccessResponse("User registered successfully.", created_user->toJson()).dump());
            } else {
                res.code = 500;
                res.write(JsonUtils::createErrorResponse("Failed to register user.", 500).dump());
            }
            return res;
        });

    // User login
    CROW_ROUTE(app, "/api/auth/login")
        .methods("POST"_method)
        ([user_repo](const crow::request& req) {
            crow::response res;
            json req_body;
            if (!JsonUtils::parseRequestBody(req, req_body, res)) {
                return res;
            }

            if (!req_body.contains("email") || !req_body.contains("password")) {
                res.code = 400;
                res.write(JsonUtils::createErrorResponse("Email and password are required.", 400).dump());
                return res;
            }

            std::string email = req_body["email"].get<std::string>();
            std::string password = req_body["password"].get<std::string>();

            if (auto user_opt = user_repo->findByEmail(email)) {
                if (Crypto::verifyPassword(password, user_opt->getPasswordHash())) {
                    std::string token = TokenManager::generateToken(*user_opt->getId(), user_opt->getRole(), Config::getJwtSecret());
                    json data;
                    data["user"] = user_opt->toJson();
                    data["token"] = token;
                    res.code = 200;
                    res.write(JsonUtils::createSuccessResponse("Login successful.", data).dump());
                } else {
                    res.code = 401;
                    res.write(JsonUtils::createErrorResponse("Invalid credentials.", 401).dump());
                }
            } else {
                res.code = 401;
                res.write(JsonUtils::createErrorResponse("Invalid credentials.", 401).dump());
            }
            return res;
        });

    Logger::info("Auth routes registered.");
}

#endif // DATAVIZ_AUTHROUTES_H
```