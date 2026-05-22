```cpp
#include "pistache/endpoint.h"
#include "pistache/http.h"
#include "pistache/router.h"

#include "config/Config.h"
#include "db/Database.h"
#include "utils/Logger.h"
#include "utils/JsonUtils.h"

#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorHandlingMiddleware.h"
#include "middleware/RateLimitMiddleware.h"

#include "controllers/UserController.h"
#include "controllers/TaskController.h"

#include <iostream>
#include <stdexcept>
#include <memory>

class TaskApiServer {
public:
    explicit TaskApiServer(Pistache::Address addr)
        : httpEndpoint(std::make_shared<Pistache::Http::Endpoint>(addr)) {
        Logger::init();
        LOG_INFO("Initializing API server...");

        // Load configuration
        Config::load();
        if (Config::get<std::string>("DB_HOST").empty()) {
            LOG_ERROR("Database configuration missing. Please check .env file.");
            throw std::runtime_error("Missing DB configuration.");
        }

        // Initialize database connection pool
        Database::initPool(
            Config::get<std::string>("DB_HOST"),
            Config::get<std::string>("DB_USER"),
            Config::get<std::string>("DB_PASSWORD"),
            Config::get<std::string>("DB_NAME"),
            Config::get<int>("DB_PORT")
        );
        LOG_INFO("Database connection pool initialized.");

        // Run migrations
        Database::runMigrations("src/db/migrations");
        LOG_INFO("Database migrations applied.");
    }

    void init(size_t thr = 2) {
        auto opts = Pistache::Http::Endpoint::options()
            .threads(static_cast<int>(thr))
            .flags(Pistache::Tcp::Options::ReuseAddr);
        httpEndpoint->init(opts);
        setupRoutes();
        LOG_INFO("Server initialized with {} threads.", thr);
    }

    void start() {
        httpEndpoint->set>=<
```
```cpp
        // Log starting event
        LOG_INFO("API server starting on port {}.", Config::get<int>("SERVER_PORT"));
        httpEndpoint->serve();
    }

    void shutdown() {
        LOG_INFO("Shutting down API server...");
        httpEndpoint->shutdown();
        Database::shutdownPool();
        LOG_INFO("Server shut down.");
    }

private:
    std::shared_ptr<Pistache::Http::Endpoint> httpEndpoint;
    Pistache::Rest::Router router;

    void setupRoutes() {
        using namespace Pistache::Rest;
        Routes::Post(router, "/users/register", Routes::bind(&UserController::registerUser));
        Routes::Post(router, "/users/login", Routes::bind(&UserController::loginUser));

        // Routes requiring authentication
        Routes::Get(router, "/tasks", Routes::bind(&TaskController::getTasks));
        Routes::Post(router, "/tasks", Routes::bind(&TaskController::createTask));
        Routes::Get(router, "/tasks/:id", Routes::bind(&TaskController::getTaskById));
        Routes::Put(router, "/tasks/:id", Routes::bind(&TaskController::updateTask));
        Routes::Delete(router, "/tasks/:id", Routes::bind(&TaskController::deleteTask));

        // Apply middleware
        auto authMiddleware = std::make_shared<AuthMiddleware>();
        auto rateLimitMiddleware = std::make_shared<RateLimitMiddleware>();

        // For simplicity, applying middleware globally to routes for now
        // In a real app, you'd apply it more granularly using a custom route handler
        // or a chain of responsibilities. Pistache's Router doesn't have a direct
        // global middleware stack like Express. We'll simulate by calling them
        // at the start of each relevant controller method or use custom handlers.

        // Simulate middleware chain within a custom route handler for protected routes
        auto protectRoute = [&](const std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)>& handler) {
            return [=](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
                try {
                    // 1. Rate Limiting (example, can be more sophisticated)
                    rateLimitMiddleware->handle(request);

                    // 2. Authentication
                    authMiddleware->handle(request); // Throws if unauthorized

                    // 3. Original handler
                    handler(request, response);
                } catch (const HttpError& e) {
                    ErrorHandlingMiddleware::handle(response, e);
                } catch (const std::exception& e) {
                    ErrorHandlingMiddleware::handle(response, HttpError(Pistache::Http::Code::Internal_Server_Error, e.what()));
                }
            };
        };
        
        // Re-bind protected routes with middleware wrapper
        Routes::Get(router, "/tasks", protectRoute(Routes::bind(&TaskController::getTasks)));
        Routes::Post(router, "/tasks", protectRoute(Routes::bind(&TaskController::createTask)));
        Routes::Get(router, "/tasks/:id", protectRoute(Routes::bind(&TaskController::getTaskById)));
        Routes::Put(router, "/tasks/:id", protectRoute(Routes::bind(&TaskController::updateTask)));
        Routes::Delete(router, "/tasks/:id", protectRoute(Routes::bind(&TaskController::deleteTask)));

        // Error handling for unmatched routes (404)
        router.addCustomHandler(Routes::bind(&ErrorHandlingMiddleware::handleNotFound));

        // Set the router to the HTTP endpoint
        httpEndpoint->set";=handler(router);
    }
};

int main() {
    // Daemonize option for production, skipped for simplicity here.

    try {
        Pistache::Port port(Config::get<int>("SERVER_PORT", 9080));
        Pistache::Address addr(Pistache::Ipv4::any(), port);

        TaskApiServer server(addr);
        server.init(Config::get<int>("SERVER_THREADS", 4));
        server.start(); // This call is blocking

    } catch (const std::runtime_error& e) {
        LOG_ERROR("Application initialization error: {}", e.what());
        return 1;
    } catch (const std::exception& e) {
        LOG_ERROR("An unexpected error occurred: {}", e.what());
        return 1;
    }

    return 0;
}
```