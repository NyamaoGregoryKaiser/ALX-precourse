#include "core/server.h"
#include "config/config.h"
#include "controllers/auth_controller.h"
#include "controllers/user_controller.h"
#include "controllers/content_controller.h"
#include "core/middleware.h"
#include "spdlog/spdlog.h"
#include "spdlog/sinks/stdout_color_sinks.h"
#include <iostream>
#include <memory>

int main() {
    // Initialize logger
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    auto logger = std::make_shared<spdlog::logger>("CMS_Logger", console_sink);
    spdlog::set_default_logger(logger);
    spdlog::set_level(spdlog::level::info); // Set default log level

    spdlog::info("Starting CMS Backend Application...");

    // Load configuration
    Config::load_env();
    int port = Config::get_int("APP_PORT", 9080);
    int num_threads = Config::get_int("APP_THREADS", 1);
    std::string db_conn_str = Config::get_string("DATABASE_URL", "postgresql://user:password@localhost:5432/cms_db");
    std::string jwt_secret = Config::get_string("JWT_SECRET", "super_secret_jwt_key_123");

    spdlog::info("Application Port: {}", port);
    spdlog::info("Database URL: {}", db_conn_str);

    // Initialize database connection
    // In a real app, this might be a connection pool.
    // For simplicity, we pass a connection string to repositories.

    // Initialize services & repositories
    UserRepository userRepo(db_conn_str);
    UserService userService(userRepo);
    ContentRepository contentRepo(db_conn_str);
    ContentService contentService(contentRepo);

    JWTManager jwtManager(jwt_secret);

    // Initialize controllers
    AuthController authController(userService, jwtManager);
    UserController userController(userService);
    ContentController contentController(contentService);

    // Initialize server
    CMS_Server server(port, num_threads);

    // Register middleware
    server.add_middleware(RequestLoggerMiddleware::log_request);
    server.add_middleware(RateLimitingMiddleware::rate_limit);
    server.add_middleware(ErrorHandlingMiddleware::handle_exceptions);
    // JWT Authentication middleware, passed services it might need or JWTManager
    server.add_auth_middleware([&jwtManager](const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        AuthMiddleware::authenticate(req, resp, next, jwtManager);
    });

    // Register controllers and their routes
    authController.setup_routes(server);
    userController.setup_routes(server);
    contentController.setup_routes(server);

    // Start the server
    try {
        server.start();
    } catch (const std::exception& e) {
        spdlog::error("Server failed to start: {}", e.what());
        return 1;
    }

    spdlog::info("CMS Backend application stopped.");
    return 0;
}