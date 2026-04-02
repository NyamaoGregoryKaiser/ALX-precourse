```cpp
#include "Server.h"
#include <fstream>
#include <chrono>

namespace TaskManager {
namespace Server {

ApiServer::ApiServer(Config::AppConfig& config, Database::Database& db, Cache::Cache& cache)
    : config_(config), db_(db), cache_(cache),
      // Initialize services, passing database and cache instances
      user_service_(db_, cache_),
      project_service_(db_, cache_),
      task_service_(db_, cache_),
      auth_service_(user_service_, config_),
      // Initialize controllers, passing their respective services
      auth_controller_(auth_service_, user_service_),
      user_controller_(user_service_),
      project_controller_(project_service_, user_service_),
      task_controller_(task_service_, project_service_, user_service_),
      // Initialize middleware with required dependencies
      app_(
          Middleware::ErrorHandlingMiddleware{}, // Error handling is stateless per request
          Middleware::AuthMiddleware{auth_service_, user_service_}, // Auth needs services
          Middleware::RateLimitingMiddleware{config_} // Rate limiting needs config
      )
{
    // Configure Crow logger to use spdlog
    crow::logger::setLogLevel(static_cast<crow::LogLevel>(Utils::Logger::getLogger()->level()));
    crow::logger::setHandler([logger = Utils::Logger::getLogger()](std::string message, crow::LogLevel level) {
        switch (level) {
            case crow::LogLevel::DEBUG: logger->debug(message); break;
            case crow::LogLevel::INFO: logger->info(message); break;
            case crow::LogLevel::WARNING: logger->warn(message); break;
            case crow::LogLevel::ERROR: logger->error(message); break;
            case crow::LogLevel::CRITICAL: logger->critical(message); break;
            default: logger->trace(message); break;
        }
    });
}

void ApiServer::initializeDatabase() {
    std::string db_path = config_.get("DATABASE_PATH", "./db/task_manager.db");
    db_.connect(db_path);

    // Run schema migrations if DB file is new or schema is outdated
    // This is a simple migration approach; for complex systems, use a dedicated migration tool.
    std::ifstream schema_file("db/schema.sql");
    if (schema_file.is_open()) {
        std::stringstream buffer;
        buffer << schema_file.rdbuf();
        std::string schema_sql = buffer.str();
        db_.execute(schema_sql);
        Utils::Logger::getLogger()->info("Database schema applied from db/schema.sql");
        schema_file.close();
    } else {
        Utils::Logger::getLogger()->error("Could not open db/schema.sql. Database schema might not be initialized.");
    }

    // Seed data
    std::ifstream seed_file("db/seed.sql");
    if (seed_file.is_open()) {
        // Check if users table is empty to avoid duplicate seeding
        ResultSet user_count = db_.query("SELECT COUNT(*) AS count FROM users;");
        if (!user_count.empty() && std::stoi(user_count[0].at("count")) == 0) {
            std::stringstream buffer;
            buffer << seed_file.rdbuf();
            std::string seed_sql = buffer.str();
            db_.execute(seed_sql);
            Utils::Logger::getLogger()->info("Database seeded from db/seed.sql");
        } else {
            Utils::Logger::getLogger()->info("Database already contains users, skipping seeding.");
        }
        seed_file.close();
    } else {
        Utils::Logger::getLogger()->warn("Could not open db/seed.sql. Database might not have initial data.");
    }
}

void ApiServer::setupRoutes() {
    // Health check endpoint
    CROW_ROUTE(app_, "/health")
        .methods("GET"_method)
        ([]() {
            auto logger = Utils::Logger::getLogger();
            logger->trace("Health check endpoint hit.");
            return crow::response(crow::status::OK, "{\"status\": \"healthy\"}");
        });

    // Mount controllers
    auth_controller_.setupRoutes(app_);
    user_controller_.setupRoutes(app_);
    project_controller_.setupRoutes(app_);
    task_controller_.setupRoutes(app_);

    Utils::Logger::getLogger()->info("All API routes configured.");
}

void ApiServer::run() {
    Utils::Logger::getLogger()->info("Starting Task Management System API Server...");

    // Initialize database
    try {
        initializeDatabase();
    } catch (const std::exception& e) {
        Utils::Logger::getLogger()->critical("Failed to initialize database: {}. Exiting.", e.what());
        return;
    }

    // Initialize cache
    long long cache_ttl = config_.getLong("CACHE_TTL_SECONDS", 300);
    cache_.init(cache_ttl);

    // Setup API routes
    setupRoutes();

    // Start server
    int port = config_.getInt("PORT", 18080);
    Utils::Logger::getLogger()->info("Server listening on port {}", port);
    app_.port(port).multithreaded().run();
}

} // namespace Server
} // namespace TaskManager
```