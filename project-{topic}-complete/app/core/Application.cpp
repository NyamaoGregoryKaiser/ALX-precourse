```cpp
#include "Application.hpp"
#include "http/Router.hpp"
#include "controllers/AuthController.hpp"
#include "controllers/UserController.hpp"
#include "controllers/MonitoredDBController.hpp"
#include "controllers/OptimizationController.hpp"
#include "http/middleware/AuthMiddleware.hpp"
#include "http/middleware/ErrorMiddleware.hpp"
#include "utils/Cache.hpp"
#include "utils/RateLimiter.hpp"

using namespace Poco::Util;
using namespace Poco::Net;

Application::Application() : _helpRequested(false) {
    // Initialize Logger early
    Logger::init();
    DB_OPTIMIZER_LOG_INFO("Application constructor called.");
}

Application::~Application() {
    DB_OPTIMIZER_LOG_INFO("Application destructor called.");
}

void Application::initialize(Poco::Util::Application& self) {
    loadConfiguration(); // Load default configuration file
    ServerApplication::initialize(self);

    configManager = std::make_unique<ConfigManager>();
    configManager->loadConfig("config.json");

    DB_OPTIMIZER_LOG_INFO("Configuration loaded. DB Host: {}", configManager->get<std::string>("database.host"));

    // Initialize DB Connection Pool for the Optimizer's own database
    dbPool = std::make_unique<DBConnectionPool>(
        "PostgreSQL",
        "host=" + configManager->get<std::string>("database.host") +
        " port=" + std::to_string(configManager->get<int>("database.port")) +
        " dbname=" + configManager->get<std::string>("database.name") +
        " user=" + configManager->get<std::string>("database.user") +
        " password=" + configManager->get<std::string>("database.password")
    );

    // Initialize Cache and RateLimiter (simple in-memory)
    Cache::initialize(configManager->get<int>("cache.max_size"), configManager->get<int>("cache.ttl_seconds"));
    RateLimiter::initialize(configManager->get<int>("rate_limiter.capacity"), configManager->get<int>("rate_limiter.refill_rate_per_sec"));

    // Initialize Services
    AuthService authService(dbPool.get(), configManager->get<std::string>("jwt.secret"));
    
    // Setup Router and Controllers
    Router router;
    AuthMiddleware authMiddleware(configManager->get<std::string>("jwt.secret"));
    ErrorMiddleware errorMiddleware;

    // Apply global middleware (order matters: error handling first for wrapping, auth next)
    router.useMiddleware(std::bind(&ErrorMiddleware::handleError, &errorMiddleware, std::placeholders::_1, std::placeholders::_2));
    // AuthMiddleware is applied per-route or to specific groups that require authentication

    AuthController authController(dbPool.get(), authService, configManager->get<std::string>("jwt.secret"));
    authController.registerRoutes(router);

    UserController userController(dbPool.get(), authService);
    userController.registerRoutes(router, authMiddleware); // Protected routes

    MonitoredDBController monitoredDBController(dbPool.get(), authService);
    monitoredDBController.registerRoutes(router, authMiddleware); // Protected routes

    // DBMonitorService initialization (requires DB adapter for target DBs)
    dbMonitorService = std::make_unique<DBMonitorService>(dbPool.get());
    dbMonitorService->startMonitoring(configManager->get<int>("monitor_interval_seconds"));

    OptimizationController optimizationController(dbPool.get(), authService, dbMonitorService.get());
    optimizationController.registerRoutes(router, authMiddleware); // Protected routes

    // Initialize HTTP Server
    unsigned short port = static_cast<unsigned short>(configManager->get<int>("server.port"));
    httpServer = std::make_unique<HTTPServer>(router, port);
    httpServer->start();

    DB_OPTIMIZER_LOG_INFO("HTTP Server initialized on port {}", port);
}

void Application::uninitialize() {
    DB_OPTIMIZER_LOG_INFO("Stopping DB-Optimizer application...");
    if (httpServer) {
        httpServer->stop();
        DB_OPTIMIZER_LOG_INFO("HTTP Server stopped.");
    }
    if (dbMonitorService) {
        dbMonitorService->stopMonitoring();
        DB_OPTIMIZER_LOG_INFO("DB Monitor Service stopped.");
    }
    ServerApplication::uninitialize();
    DB_OPTIMIZER_LOG_INFO("Application uninitialized.");
}

void Application::defineOptions(Poco::Util::OptionSet& options) {
    ServerApplication::defineOptions(options);

    options.addOption(
        Option("help", "h", "display help message").setter(OptionCallback<Application>(this, &Application::handleOption))
    );
}

void Application::handleOption(const std::string& name, const std::string& value) {
    if (name == "help") {
        _helpRequested = true;
    }
}

int Application::main(const std::vector<std::string>& args) {
    if (_helpRequested) {
        displayHelp();
    } else {
        DB_OPTIMIZER_LOG_INFO("Application running. Press CTRL+C to exit.");
        waitForTerminationRequest(); // Wait for SIGINT or SIGTERM
        DB_OPTIMIZER_LOG_INFO("Termination requested.");
    }
    return Application::EXIT_OK;
}
```