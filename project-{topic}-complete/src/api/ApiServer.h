```cpp
#ifndef VISUFLOW_API_SERVER_H
#define VISUFLOW_API_SERVER_H

#include "handlers/AuthHandler.h"
#include "handlers/DataHandler.h"
#include "handlers/DashboardHandler.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/RateLimitMiddleware.h"
#include "core/cache/CacheManager.h"
#include "util/Logger.h"

#include <memory>
#include <string>
#include <vector>

// Conceptual HTTP server library classes (e.g., from Pistache, Crow, cpprestsdk)
namespace Http {
    namespace Endpoint {
        class Http; // Represents an HTTP server endpoint
    }
    namespace Rest {
        class Router; // Handles routing requests to handlers
        using Request = std::string; // Simplified mock request type
        using Response = std::string; // Simplified mock response type
        using Handler = std::function<void(const Request&, Response&)>; // Simplified mock handler
    }
}

namespace VisuFlow {
namespace API {

/**
 * @brief Manages the REST API server for VisuFlow Analytics Platform.
 *
 * This class initializes and manages the HTTP server, registers API endpoints,
 * and applies middleware for authentication, rate limiting, and caching.
 */
class ApiServer {
public:
    explicit ApiServer(unsigned int port);
    ~ApiServer();

    /**
     * @brief Starts the API server, listening for incoming requests.
     */
    void start();

    /**
     * @brief Stops the API server.
     */
    void stop();

private:
    unsigned int m_port;
    std::unique_ptr<Http::Endpoint::Http> m_httpEndpoint; // Conceptual HTTP server
    std::shared_ptr<Http::Rest::Router> m_router; // Conceptual router

    // Handlers
    AuthHandler m_authHandler;
    DataHandler m_dataHandler;
    DashboardHandler m_dashboardHandler;

    // Middleware
    AuthMiddleware m_authMiddleware;
    RateLimitMiddleware m_rateLimitMiddleware;
    Core::Cache::CacheManager m_cacheManager; // Using CacheManager directly for simple cache checks

    /**
     * @brief Configures and registers all API routes and their handlers.
     */
    void setupRoutes();

    /**
     * @brief Applies middleware to a handler chain.
     * @tparam Args Handler arguments (e.g., request, response).
     * @param handler The final handler to be called.
     * @param applyAuth If true, apply authentication middleware.
     * @param applyRateLimit If true, apply rate limiting middleware.
     * @return A wrapped handler with middleware applied.
     */
    Http::Rest::Handler applyMiddleware(
        Http::Rest::Handler handler,
        bool applyAuth = true,
        bool applyRateLimit = true
    );

    /**
     * @brief Conceptual handler wrapper for logging and error handling.
     * This acts as the outermost layer of the request processing.
     */
    Http::Rest::Handler wrapWithLoggingAndErrorHandling(Http::Rest::Handler handler);
};

} // namespace API
} // namespace VisuFlow

#endif // VISUFLOW_API_SERVER_H
```