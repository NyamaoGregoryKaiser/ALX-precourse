#include <drogon/drogon.h>
#include "utils/AppConfig.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorHandler.h"
#include "utils/RedisManager.h"

// Include all controllers and services to ensure they are linked
#include "controllers/AuthController.h"
#include "controllers/UserController.h"
#include "controllers/ProductController.h"
#include "controllers/OrderController.h"
#include "services/AuthService.h"
#include "services/UserService.h"
#include "services/ProductService.h"
#include "services/OrderService.h"
#include "repositories/UserRepository.h"
#include "repositories/ProductRepository.h"
#include "repositories/OrderRepository.h"
#include "utils/CryptoUtils.h"
#include "utils/JwtManager.h"

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>

void setup_logging() {
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_level(spdlog::level::trace);

    // Create a rotating file sink for production logs
    auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
        "logs/backend.log", 1048576 * 5, 3
    ); // 5MB per file, 3 files rotation
    file_sink->set_level(spdlog::level::info);

    spdlog::sinks_init_list sink_list = {console_sink, file_sink};
    auto logger = std::make_shared<spdlog::logger>("backend_logger", sink_list.begin(), sink_list.end());
    logger->set_level(spdlog::level::trace); // Set overall logger level
    spdlog::set_default_logger(logger);
    spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    spdlog::info("Logging system initialized.");
}


int main() {
    setup_logging();
    spdlog::info("Starting Mobile Backend Application...");

    // 1. Load configuration
    const std::string config_path = "app_config.json"; // Relative path to executable
    if (!AppConfig::getInstance().load(config_path)) {
        spdlog::error("Failed to load configuration from {}. Exiting.", config_path);
        return 1;
    }
    spdlog::info("Configuration loaded successfully from {}.", config_path);

    // 2. Configure Drogon
    auto& config = AppConfig::getInstance();
    drogon::app().addListener(config.getString("server_host"), config.getInt("server_port"));
    drogon::app().setThreadNum(config.getInt("server_threads"));

    // Configure database connection
    drogon::app().enablePostgreSQL(
        config.getString("db_host"),
        config.getInt("db_port"),
        config.getString("db_user"),
        config.getString("db_password"),
        config.getString("db_name"),
        config.getInt("db_connections"),
        config.getString("db_connection_name")
    );
    spdlog::info("PostgreSQL connection pool configured for '{}'.", config.getString("db_name"));

    // Configure Redis connection
    RedisManager::getInstance().connect(
        config.getString("redis_host"),
        config.getInt("redis_port"),
        config.getString("redis_password")
    );

    // 3. Register Global Middleware (Error Handling)
    // This catches exceptions thrown by controllers and returns a standardized error response.
    drogon::app().registerHandler(
        "/",
        [](const drogon::HttpRequestPtr &req,
           std::function<void (const drogon::HttpResponsePtr &)> &&callback) {
            auto resp = drogon::HttpResponse::newNotFoundResponse();
            resp->setBody("{\"code\":404,\"message\":\"Not Found\"}");
            resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
            callback(resp);
        },
        {drogon::HttpMethod::Get, drogon::HttpMethod::Post, drogon::HttpMethod::Put, drogon::HttpMethod::Delete}
    ); // Default not found handler


    // Register the global error handler middleware (this must be registered early)
    drogon::app().registerPostHandlingAdvice([](const drogon::HttpRequestPtr &req,
                                                 const drogon::HttpResponsePtr &resp) {
        if (resp->statusCode() >= 400 && resp->statusCode() != 404 && resp->statusCode() != 401 && resp->statusCode() != 403) {
            // Log generic errors not caught by specific handlers
            spdlog::error("Unhandled HTTP Error: Status={} Path={} Body={}",
                          resp->statusCode(),
                          req->path(),
                          resp->body());
            // Optionally, transform generic error pages into JSON
            if (resp->contentType() != drogon::CT_APPLICATION_JSON) {
                Json::Value errorJson;
                errorJson["code"] = resp->statusCode();
                errorJson["message"] = "An unexpected error occurred.";
                auto newResp = drogon::HttpResponse::newHttpJsonResponse(errorJson);
                newResp->setStatusCode(resp->statusCode());
                return newResp;
            }
        }
        return resp;
    });

    // 4. Start Drogon application
    try {
        spdlog::info("Server is listening on {}:{}.", config.getString("server_host"), config.getInt("server_port"));
        drogon::app().run();
    } catch (const std::exception& e) {
        spdlog::critical("Application crashed: {}", e.what());
        return 1;
    }

    spdlog::info("Mobile Backend Application stopped.");
    return 0;
}