```cpp
#include <iostream>
#include <string>
#include <cstdlib> // For getenv
#include <crow/crow.h>
#include <crow/middlewares/cors.h> // For CORS

// Utilities
#include "utils/logger.h"
#include "utils/database.h"
#include "utils/jwt_manager.h"
#include "utils/auth_middleware.h"
#include "utils/error_middleware.h"
#include "utils/rate_limiter.h"
#include "utils/cache.h"

// Models (implicitly included by services)

// Services
#include "services/auth_service.h"
#include "services/user_service.h"
#include "services/task_service.h"

// Controllers
#include "controllers/auth_controller.h"
#include "controllers/user_controller.h"
#include "controllers/task_controller.h"

// Environment variable helper
std::string get_env_var(const std::string& name, const std::string& default_value = "") {
    const char* value = std::getenv(name.c_str());
    if (value) {
        return value;
    }
    return default_value;
}

int main() {
    using namespace mobile_backend::utils;
    using namespace mobile_backend::services;
    using namespace mobile_backend::controllers;
    using namespace mobile_backend::models;

    // 1. Initialize Logger
    // Logger is a singleton, just call get_logger() once to initialize
    LOG_INFO("Starting Mobile Backend Application...");

    // 2. Load Configuration from Environment Variables
    const std::string app_port_str = get_env_var("APP_PORT", "18080");
    int app_port = std::stoi(app_port_str);
    const std::string db_path = get_env_var("DATABASE_PATH", "./data/mobile_backend.db");
    const std::string jwt_secret = get_env_var("JWT_SECRET", "super_secret_default_key_should_be_changed_in_prod_12345");
    const int cache_ttl_seconds = std::stoi(get_env_var("CACHE_TTL_SECONDS", "600")); // 10 minutes
    const int rate_limit_max_requests = std::stoi(get_env_var("RATE_LIMIT_MAX_REQUESTS", "100"));
    const int rate_limit_window_seconds = std::stoi(get_env_var("RATE_LIMIT_WINDOW_SECONDS", "60"));

    if (jwt_secret == "super_secret_default_key_should_be_changed_in_prod_12345") {
        LOG_CRITICAL("Using default JWT_SECRET. PLEASE change this in production!");
    }
    if (db_path == "./data/mobile_backend.db") {
        LOG_WARN("Using default DATABASE_PATH. Consider an absolute path for production.");
    }

    // 3. Initialize Database
    Database& db = Database::get_instance();
    if (!db.initialize(db_path)) {
        LOG_CRITICAL("Failed to initialize database. Exiting.");
        return 1;
    }
    LOG_INFO("Database initialized successfully at: {}", db_path);

    // 4. Initialize JWT Manager
    JwtManager jwt_manager(jwt_secret);

    // 5. Initialize Caches
    Cache<User> user_cache(std::chrono::seconds(cache_ttl_seconds));
    Cache<Task> task_cache(std::chrono::seconds(cache_ttl_seconds));

    // 6. Initialize Rate Limiter
    RateLimiter rate_limiter(rate_limit_max_requests, std::chrono::seconds(rate_limit_window_seconds));

    // 7. Initialize Services
    AuthService auth_service(db, jwt_manager);
    UserService user_service(db, user_cache);
    TaskService task_service(db, task_cache);

    // 8. Initialize Controllers
    AuthController auth_controller(auth_service);
    UserController user_controller(user_service);
    TaskController task_controller(task_service);

    // 9. Setup Crow App with Middlewares
    // Order matters: Rate Limiter -> Error Handler -> Auth -> then actual routes
    crow::App<AuthMiddleware, ErrorMiddleware, crow::CORSHandler> app;

    // Configure CORS
    auto& cors = app.get_middleware<crow::CORSHandler>();
    cors
        .global()
        .allow_origin("*") // For development, allow all. Restrict in production.
        .allow_methods("GET, POST, PUT, DELETE, PATCH"_method)
        .allow_headers("Authorization, Content-Type")
        .expose_headers("X-Custom-Header")
        .max_age(3600);

    // Error handler for Crow (catches unhandled exceptions within routes/middlewares)
    app.error_handler([](crow::request& req, crow::response& res, crow::Error err) {
        LOG_ERROR("Crow unhandled error: {} on {} {}", static_cast<int>(err), req.method_string(), req.url);
        crow::json::wvalue error_json;
        int status_code = 500;
        std::string message = "Internal Server Error";

        switch(err) {
            case crow::Error::BadJSON:
                status_code = 400;
                message = "Invalid JSON format.";
                break;
            case crow::Error::NotFound:
                status_code = 404;
                message = "Endpoint not found.";
                break;
            default:
                // Default to 500 for other unexpected Crow errors
                break;
        }

        error_json["error"] = message;
        error_json["status"] = status_code;
        res.code = status_code;
        res.set_header("Content-Type", "application/json");
        res.write(error_json.dump());
        res.end();
    });

    // Custom exception handler using the ErrorMiddleware for structured responses
    // Wrap route handlers in a try-catch block for AppException
    auto handle_exceptions = [&](std::function<crow::response(crow::request&, crow::response&, const AuthMiddleware::context&)> handler) {
        return [&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
            try {
                return handler(req, res, ctx);
            } catch (const AppException& e) {
                LOG_WARN("API Error (Status {}): {} - Details: {}", e.status_code, e.what(), e.details);
                crow::json::wvalue error_json;
                error_json["error"] = e.what();
                if (!e.details.empty()) {
                    error_json["details"] = e.details;
                }
                error_json["status"] = e.status_code;
                res.code = e.status_code;
                res.set_header("Content-Type", "application/json");
                res.write(error_json.dump());
                return res; // Return the response directly
            } catch (const std::exception& e) {
                LOG_ERROR("Unhandled exception in route handler: {}", e.what());
                crow::json::wvalue error_json;
                error_json["error"] = "An unexpected server error occurred.";
                error_json["status"] = 500;
                res.code = 500;
                res.set_header("Content-Type", "application/json");
                res.write(error_json.dump());
                return res;
            }
        };
    };
    
    // Global rate limiting middleware (before AuthMiddleware)
    // This is a manual application of rate limiting to all routes for simplicity.
    // In a production scenario, you might have per-route or per-user rate limiting.
    app.before_handle([&](crow::request& req, crow::response& res, AuthMiddleware::context& auth_ctx, ErrorMiddleware::context& err_ctx, crow::CORSHandler::context& cors_ctx) {
        std::string ip = req.remote_ip_address;
        if (!rate_limiter.allow_request(ip)) {
            LOG_WARN("Rate limit triggered for IP: {}", ip);
            res.code = 429; // Too Many Requests
            res.write(crow::json::wvalue({{"error", "Too Many Requests"}}).dump());
            res.end();
        }
    });

    // 10. Define API Endpoints

    // Root endpoint (health check / info)
    CROW_ROUTE(app, "/")
    ([&]() {
        LOG_INFO("Root endpoint hit.");
        crow::json::wvalue x;
        x["message"] = "Mobile Backend API is running!";
        x["version"] = "1.0.0";
        return x;
    });

    // Auth Controller
    CROW_ROUTE(app, "/auth/register").methods("POST"_method)
    ([&](const crow::request& req) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return auth_controller.register_user(r);
        })(req, crow::response(), app.get_context<AuthMiddleware>(req));
    });

    CROW_ROUTE(app, "/auth/login").methods("POST"_method)
    ([&](const crow::request& req) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return auth_controller.login_user(r);
        })(req, crow::response(), app.get_context<AuthMiddleware>(req));
    });

    // User Controller
    CROW_ROUTE(app, "/users/me").methods("GET"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager)) // Apply AuthMiddleware to this route
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return user_controller.get_user_profile(r, rs, c);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/users/me").methods("PATCH"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return user_controller.update_user_profile(r, rs, c);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/users/me/password").methods("PATCH"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return user_controller.update_user_password(r, rs, c);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/users/me").methods("DELETE"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return user_controller.delete_user_account(r, rs, c);
        })(req, res, ctx);
    });

    // Task Controller
    CROW_ROUTE(app, "/tasks").methods("POST"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return task_controller.create_task(r, rs, c);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/tasks/<int>").methods("GET"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx, int task_id) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return task_controller.get_task_by_id(r, rs, c, task_id);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/tasks").methods("GET"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return task_controller.get_all_tasks(r, rs, c);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/tasks/<int>").methods("PATCH"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx, int task_id) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return task_controller.update_task(r, rs, c, task_id);
        })(req, res, ctx);
    });

    CROW_ROUTE(app, "/tasks/<int>").methods("DELETE"_method)
    .CROW_MIDDLEWARES(app, AuthMiddleware(jwt_manager))
    ([&](crow::request& req, crow::response& res, const AuthMiddleware::context& ctx, int task_id) {
        return handle_exceptions([&](crow::request& r, crow::response& rs, const AuthMiddleware::context& c) {
            return task_controller.delete_task(r, rs, c, task_id);
        })(req, res, ctx);
    });

    // Run the app
    LOG_INFO("Server starting on port {}.", app_port);
    app.port(app_port).multithreaded().run();

    LOG_INFO("Application shut down.");
    return 0;
}
```