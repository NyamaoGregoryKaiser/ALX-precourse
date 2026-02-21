```cpp
#ifndef SYSTEMCONTROLLER_H
#define SYSTEMCONTROLLER_H

#include <crow.h>
#include <string>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <memory>

#include "../services/SystemService.h"
#include "../database/DbConnection.h"
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/JsonUtils.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext
#include "../services/RateLimiter.h" // For rate limiting

class SystemController {
public:
    SystemController(std::function<std::shared_ptr<pqxx::connection>()> get_conn_func)
        : get_conn_from_pool(std::move(get_conn_func)) {}

    // Create a new system
    crow::response createSystem(const crow::request& req) {
        // Apply rate limiting by IP address for creation endpoints
        std::string client_ip = req.get_header("X-Forwarded-For") ? req.get_header("X-Forwarded-For") : req.remote_ip_address();
        if (RateLimiter::is_rate_limited(client_ip)) {
            LOG_WARN("Rate limit exceeded for IP {} on createSystem.", client_ip);
            throw ApiException(crow::TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
        }

        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::string name = JsonUtils::get_required<std::string>(request_body, "name");
            std::optional<std::string> description = JsonUtils::get_optional<std::string>(request_body, "description");
            
            auto conn = get_conn_from_pool();
            SystemService systemService(conn);
            System system = systemService.create_system(user_id, name, description);
            DbConnection::release_connection(conn);

            return crow::response(crow::CREATED, system.to_json().dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in createSystem: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in createSystem for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system creation.");
        }
    }

    // Get all systems for the authenticated user
    crow::response getSystems(const crow::request& req) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            auto conn = get_conn_from_pool();
            SystemService systemService(conn);
            std::vector<System> systems = systemService.get_systems_for_user(user_id);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& system : systems) {
                response_json.push_back(system.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getSystems for user {}: {}", user_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get a single system by ID for the authenticated user
    crow::response getSystem(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            auto conn = get_conn_from_pool();
            SystemService systemService(conn);
            std::optional<System> system = systemService.get_system(user_id, system_id);
            DbConnection::release_connection(conn);

            if (!system) {
                throw ApiException(crow::NOT_FOUND, "System not found or not owned by user.");
            }

            return crow::response(crow::OK, system->to_json().dump());

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getSystem for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Update an existing system
    crow::response updateSystem(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::optional<std::string> name = JsonUtils::get_optional<std::string>(request_body, "name");
            std::optional<std::string> description = JsonUtils::get_optional<std::string>(request_body, "description");
            
            auto conn = get_conn_from_pool();
            SystemService systemService(conn);
            System updated_system = systemService.update_system(user_id, system_id, name, description);
            DbConnection::release_connection(conn);

            return crow::response(crow::OK, updated_system.to_json().dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in updateSystem: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in updateSystem for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system update.");
        }
    }

    // Delete a system
    crow::response deleteSystem(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        try {
            auto conn = get_conn_from_pool();
            SystemService systemService(conn);
            systemService.delete_system(user_id, system_id);
            DbConnection::release_connection(conn);

            return crow::response(crow::NO_CONTENT);

        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in deleteSystem for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during system deletion.");
        }
    }

private:
    std::function<std::shared_ptr<pqxx::connection>()> get_conn_from_pool;
};

#endif // SYSTEMCONTROLLER_H
```