```cpp
#ifndef AUTHCONTROLLER_H
#define AUTHCONTROLLER_H

#include <crow.h>
#include <string>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <memory>

#include "../services/AuthService.h"
#include "../database/DbConnection.h" // For getting a fresh connection
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/JsonUtils.h"

class AuthController {
public:
    // Pass the connection pool (or a connection factory) to controllers
    AuthController(std::function<std::shared_ptr<pqxx::connection>()> get_conn_func)
        : get_conn_from_pool(std::move(get_conn_func)) {}

    // Handler for user registration
    crow::response registerUser(const crow::request& req) {
        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::string username = JsonUtils::get_required<std::string>(request_body, "username");
            std::string email = JsonUtils::get_required<std::string>(request_body, "email");
            std::string password = JsonUtils::get_required<std::string>(request_body, "password");
            
            // Get a connection from the pool and ensure it's returned
            auto conn = get_conn_from_pool();
            AuthService authService(conn);
            User user = authService.register_user(username, email, password);
            DbConnection::release_connection(conn); // Release connection back to pool

            nlohmann::json response_json = {
                {"message", "User registered successfully"},
                {"user", user.to_json()}
            };
            return crow::response(crow::CREATED, response_json.dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in registerUser: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e; // Re-throw specific API exceptions
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in registerUser: {}", e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during registration.");
        }
    }

    // Handler for user login
    crow::response loginUser(const crow::request& req) {
        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::string email = JsonUtils::get_required<std::string>(request_body, "email");
            std::string password = JsonUtils::get_required<std::string>(request_body, "password");
            
            auto conn = get_conn_from_pool();
            AuthService authService(conn);
            std::string token = authService.login_user(email, password);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = {
                {"message", "Login successful"},
                {"token", token}
            };
            return crow::response(crow::OK, response_json.dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in loginUser: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in loginUser: {}", e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during login.");
        }
    }

private:
    std::function<std::shared_ptr<pqxx::connection>()> get_conn_from_pool;
};

#endif // AUTHCONTROLLER_H
```