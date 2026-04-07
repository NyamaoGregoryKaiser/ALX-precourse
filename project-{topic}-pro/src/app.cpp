```cpp
#include "app.h"
#include "common/error_handler.h"
#include <chrono>
#include <thread>

WebScraperApp::WebScraperApp()
    : userRepository(), jobRepository(),
      userService(userRepository), jobService(jobRepository), scraperCore(),
      authController(userService), jobsController(jobService, scraperService)
{
    Logger::init(); // Initialize logger as first step
    Config::getInstance().load("config.json"); // Load config

    int port = Config::getInstance().getInt("server.port");
    int threads = Config::getInstance().getInt("server.threads");

    Pistache::Address addr(Pistache::Ipv4::any(), Pistache::Port(port));
    httpEndpoint = std::make_shared<Pistache::Http::Endpoint>(addr);

    auto opts = Pistache::Http::Endpoint::options()
        .threads(threads)
        .flags(Pistache::Tcp::Options::ReuseAddr);
    httpEndpoint->init(opts);
    
    setupRoutes();
    setupGlobalErrorHandling();

    // Initialize the singleton ScraperService with its dependencies
    scraperService.initialize(jobRepository, scraperCore);

    Logger::info("WebScraperApp", "Application initialized on port {} with {} threads.", port, threads);
}

WebScraperApp::~WebScraperApp() {
    Logger::info("WebScraperApp", "Application destructor called.");
}

void WebScraperApp::setupRoutes() {
    // A simple health check endpoint without authentication
    Pistache::Rest::Routes::Get(router, "/health", Pistache::Rest::Routes::bind([](const Pistache::Rest::Request&, Pistache::Http::ResponseWriter response) {
        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, "{\"status\": \"UP\"}").done();
        Logger::debug("WebScraperApp", "Health check requested.");
    }));

    // Pass the router to controllers for route setup
    authController.setupRoutes(router);
    jobsController.setupRoutes(router);

    // Serve static files (minimal frontend)
    Pistache::Rest::Routes::Get(router, "/", Pistache::Rest::Routes::staticProxy("frontend/index.html"));
    Pistache::Rest::Routes::Get(router, "/static/*", Pistache::Rest::Routes::staticDir("frontend"));

    Logger::info("WebScraperApp", "All routes setup.");
}

void WebScraperApp::setupGlobalErrorHandling() {
    httpEndpoint->set.</* any http code */>(Pistache::Rest::Routes::bind([&](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        nlohmann::json err_json;
        err_json["error"] = "Route not found";
        err_json["path"] = request.resource();
        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Not_Found, err_json.dump()).done();
        Logger::warn("GlobalError", "404 Not Found for path: {}", request.resource());
    }));
    // Note: Pistache's default error handling for exceptions from handlers can be limited.
    // Our controllers catch exceptions internally for more granular control.
}

void WebScraperApp::run() {
    Logger::info("WebScraperApp", "Starting HTTP endpoint...");
    httpEndpoint->setHandler(router.handler());
    httpEndpoint->serveThreaded(); // Serve requests in a dedicated thread pool

    // Start the job scheduler in its own thread
    scraperService.startJobScheduler();

    Logger::info("WebScraperApp", "Web scraper application started. Press Ctrl+C to exit.");
    // Keep main thread alive until shutdown signal
    std::this_thread::yield();
    // This is a blocking call to wait for a signal (e.g., Ctrl+C)
    // In a real system, use signal handlers (SIGINT, SIGTERM) for graceful shutdown.
    // For now, `serveThreaded` runs until `shutdown()` is called.
    // A simple blocking loop for graceful shutdown in main.cpp will be used.
}

void WebScraperApp::shutdown() {
    Logger::info("WebScraperApp", "Shutting down application...");
    scraperService.stopJobScheduler(); // Stop scheduler gracefully
    httpEndpoint->shutdown();
    Logger::info("WebScraperApp", "Application gracefully shut down.");
}
```