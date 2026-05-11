#include "server/HttpServer.h"
#include "server/RequestHandler.h"
#include "db/DbConnection.h"
#include "db/migrations/MigrationManager.h"
#include "utils/Logger.h"
#include "utils/Config.h"
#include "services/AuthService.h"
#include "db/repositories/UserRepository.h" // For initial admin creation

#include <iostream>
#include <memory>
#include <boost/asio/signal_set.hpp>

int main(int argc, char* argv[]) {
    // 1. Initialize Logger
    Logger::init();
    LOG_INFO("Starting Database Optimizer application...");

    // 2. Load Configuration
    Config::load_config(".env");
    const std::string db_conn_str = Config::get("DB_CONNECTION_STRING");
    const int port = std::stoi(Config::get("SERVER_PORT", "8080"));
    const std::string jwt_secret = Config::get("JWT_SECRET");

    if (db_conn_str.empty() || jwt_secret.empty()) {
        LOG_ERROR("Missing critical environment variables. Exiting.");
        return EXIT_FAILURE;
    }

    // 3. Initialize Database Connection Pool
    try {
        DbConnection::init(db_conn_str);
        LOG_INFO("Database connection pool initialized.");
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to initialize database: {}", e.what());
        return EXIT_FAILURE;
    }

    // 4. Run Migrations
    try {
        MigrationManager migration_manager("./database/migrations");
        migration_manager.runMigrations();
        LOG_INFO("Database migrations completed successfully.");
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to run database migrations: {}", e.what());
        return EXIT_FAILURE;
    }

    // 5. Create Initial Admin User (if not exists)
    try {
        auto conn = DbConnection::getPool().getConnection();
        UserRepository user_repo(conn);
        if (!user_repo.findByUsername("admin")) {
            User admin_user = {"admin", AuthService::hashPassword("admin_password_secure"), "admin@example.com", "ADMIN"};
            user_repo.create(admin_user);
            LOG_WARN("Default admin user 'admin' created with password 'admin_password_secure'. PLEASE CHANGE IT IMMEDIATELY!");
        }
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to check/create admin user: {}", e.what());
        // Continue, as this might be due to concurrent startup
    }


    // 6. Setup HTTP Server
    boost::asio::io_context ioc{};
    boost::asio::ip::tcp::endpoint endpoint{boost::asio::ip::make_address("0.0.0.0"), static_cast<unsigned short>(port)};

    // Instantiate services and repositories
    AuthService auth_service(jwt_secret);
    RequestHandler request_handler(auth_service); // Pass services/repos here

    // This is where you would register your routes with `request_handler`
    // Example: request_handler.registerRoute("/api/v1/users", HttpMethod::GET, handleGetUsers);

    // Initial setup of routes:
    request_handler.setupRoutes();

    HttpServer server(ioc, endpoint, request_handler);
    LOG_INFO("HTTP Server listening on {}:{}", endpoint.address().to_string(), endpoint.port());

    // 7. Handle OS Signals for graceful shutdown
    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&](const boost::system::error_code& error, int signal_number) {
        if (!error) {
            LOG_INFO("Received signal {}, shutting down gracefully...", signal_number);
            server.stop(); // Request server to stop accepting new connections
            ioc.stop();    // Stop io_context
        }
    });

    // 8. Run io_context
    ioc.run();

    LOG_INFO("Application shutdown complete.");
    return EXIT_SUCCESS;
}
```