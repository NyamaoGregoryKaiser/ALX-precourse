```cpp
#include "ApiServer.h"
#include "util/ErrorHandler.h"
#include "core/config/ConfigManager.h"

// Mock HTTP library implementations for demonstration
namespace Http {
    namespace Endpoint {
        class Http {
        public:
            Http(Address addr) : m_addr(addr) {}
            void init() {
                VisuFlow::Util::Logger::log(spdlog::level::info, "Mock Http Endpoint initialized for {}:{}", m_addr.host(), m_addr.port());
            }
            void setHandler(std::shared_ptr<Rest::Router> router) { m_router = router; }
            void serveThreaded() {
                VisuFlow::Util::Logger::log(spdlog::level::info, "Mock Http Endpoint serving in a new thread...");
                // In a real scenario, this would start the server's listening loop
            }
            void shutdown() {
                VisuFlow::Util::Logger::log(spdlog::level::info, "Mock Http Endpoint shutting down.");
            }
        private:
            Address m_addr;
            std::shared_ptr<Rest::Router> m_router;
        };
    }
    namespace Rest {
        class Router {
        public:
            // Simplified route addition
            void get(const std::string& path, Handler handler) {
                m_routes["GET " + path] = handler;
                VisuFlow::Util::Logger::log(spdlog::level::debug, "Registered GET {}", path);
            }
            void post(const std::string& path, Handler handler) {
                m_routes["POST " + path] = handler;
                VisuFlow::Util::Logger::log(spdlog::level::debug, "Registered POST {}", path);
            }
            // Mock handle request, in real Pistache this would be handled by the endpoint
            void handleRequest(const Request& req, Response& res) {
                VisuFlow::Util::Logger::log(spdlog::level::debug, "Mock Router received request: {}", req);
                // Simple mock routing
                if (req.find("GET /api/v1/data") != std::string::npos) {
                    if (m_routes.count("GET /api/v1/data")) {
                        m_routes["GET /api/v1/data"](req, res);
                        return;
                    }
                }
                if (req.find("GET /api/v1/dashboards") != std::string::npos) {
                     if (m_routes.count("GET /api/v1/dashboards")) {
                        m_routes["GET /api/v1/dashboards"](req, res);
                        return;
                    }
                }
                if (req.find("POST /api/v1/auth/login") != std::string::npos) {
                    if (m_routes.count("POST /api/v1/auth/login")) {
                        m_routes["POST /api/v1/auth/login"](req, res);
                        return;
                    }
                }
                // Add more complex parsing for real API endpoints.
                res = "404 Not Found";
            }
        private:
            std::map<std::string, Handler> m_routes;
        };
    }
}


namespace VisuFlow {
namespace API {

ApiServer::ApiServer(unsigned int port)
    : m_port(port),
      m_router(std::make_shared<Http::Rest::Router>()),
      m_authHandler(),
      m_dataHandler(),
      m_dashboardHandler(),
      m_authMiddleware(),
      m_rateLimitMiddleware() {

    // Conceptual Address object for Http::Endpoint (e.g., Pistache's Address)
    struct Address {
        std::string host_ = "0.0.0.0";
        unsigned int port_;
        Address(std::string host, unsigned int port) : host_(std::move(host)), port_(port) {}
        std::string host() const { return host_; }
        unsigned int port() const { return port_; }
    };
    Http::Endpoint::Http::options().threads(Core::Config::ConfigManager::getInstance().getUint("api_threads", 4));
    m_httpEndpoint = std::make_unique<Http::Endpoint::Http>(Address("0.0.0.0", m_port));
}

ApiServer::~ApiServer() {
    stop();
}

void ApiServer::start() {
    m_httpEndpoint->init();
    setupRoutes();
    m_httpEndpoint->setHandler(m_router);
    m_httpEndpoint->serveThreaded(); // Use serveThreaded for non-blocking in main
}

void ApiServer::stop() {
    if (m_httpEndpoint) {
        m_httpEndpoint->shutdown();
    }
}

// Applies middleware sequentially
Http::Rest::Handler ApiServer::applyMiddleware(
    Http::Rest::Handler handler,
    bool applyAuth,
    bool applyRateLimit
) {
    // Apply in reverse order of execution (outermost first)
    // 1. Logging and Error Handling (always apply)
    Http::Rest::Handler wrappedHandler = wrapWithLoggingAndErrorHandling(handler);

    // 2. Caching (if applicable) - simplified, usually cache is a separate middleware/interceptor
    // Here we'll just log its conceptual presence.
    wrappedHandler = [this, prev = std::move(wrappedHandler)](const Http::Rest::Request& req, Http::Rest::Response& res) {
        VisuFlow::Util::Logger::log(spdlog::level::debug, "Applying Cache Middleware (conceptual)...");
        // In a real implementation, check cache, if hit, return cached response.
        // If miss, call prev(req, res) and then cache the result.
        // For now, just pass through.
        prev(req, res);
    };

    // 3. Rate Limiting
    if (applyRateLimit) {
        wrappedHandler = [this, prev = std::move(wrappedHandler)](const Http::Rest::Request& req, Http::Rest::Response& res) {
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Applying Rate Limit Middleware...");
            if (!m_rateLimitMiddleware.handleRequest(req, res)) { // If rate limited, middleware sets response
                return;
            }
            prev(req, res);
        };
    }

    // 4. Authentication and Authorization
    if (applyAuth) {
        wrappedHandler = [this, prev = std::move(wrappedHandler)](const Http::Rest::Request& req, Http::Rest::Response& res) {
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Applying Auth Middleware...");
            if (!m_authMiddleware.handleRequest(req, res)) { // If auth fails, middleware sets response
                return;
            }
            prev(req, res);
        };
    }

    return wrappedHandler;
}


Http::Rest::Handler ApiServer::wrapWithLoggingAndErrorHandling(Http::Rest::Handler handler) {
    return [handler_ = std::move(handler)](const Http::Rest::Request& req, Http::Rest::Response& res) {
        VisuFlow::Util::Logger::log(spdlog::level::info, "Received request: {}", req);
        try {
            handler_(req, res);
        } catch (const VisuFlow::Util::APIException& e) {
            VisuFlow::Util::Logger::log(spdlog::level::warn, "API Exception caught: {} - Status: {}", e.what(), e.statusCode());
            VisuFlow::Util::ErrorHandler::handleAPIException(e, res);
        } catch (const std::exception& e) {
            VisuFlow::Util::Logger::log(spdlog::level::error, "Unhandled exception: {}", e.what());
            VisuFlow::Util::ErrorHandler::handleGenericError(e, res);
        } catch (...) {
            VisuFlow::Util::Logger::log(spdlog::level::critical, "Unknown exception caught.");
            VisuFlow::Util::ErrorHandler::handleUnknownError(res);
        }
        VisuFlow::Util::Logger::log(spdlog::level::info, "Responded to request with: {}", res);
    };
}


void ApiServer::setupRoutes() {
    // Authentication Endpoints (no auth middleware needed for login itself)
    m_router->post("/api/v1/auth/login", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_authHandler.handleLogin(req, res);
        }, false, false)); // No auth, no rate limit for login to avoid deadlocks/UX issues

    // Data Endpoints (requires authentication, applies rate limiting)
    m_router->get("/api/v1/data", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dataHandler.getProcessedData(req, res);
        })); // Auth & Rate Limit applied by default

    m_router->post("/api/v1/data/sources", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dataHandler.createDataSource(req, res);
        }));

    // Dashboard Endpoints (requires authentication, applies rate limiting)
    m_router->get("/api/v1/dashboards", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dashboardHandler.getAllDashboards(req, res);
        }));

    m_router->get("/api/v1/dashboards/:id", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dashboardHandler.getDashboardById(req, res);
        }));

    m_router->post("/api/v1/dashboards", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dashboardHandler.createDashboard(req, res);
        }));

    m_router->put("/api/v1/dashboards/:id", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dashboardHandler.updateDashboard(req, res);
        }));

    m_router->delete_("/api/v1/dashboards/:id", applyMiddleware(
        [this](const Http::Rest::Request& req, Http::Rest::Response& res) {
            m_dashboardHandler.deleteDashboard(req, res);
        }));

    VisuFlow::Util::Logger::log(spdlog::level::info, "All API routes configured.");
}

} // namespace API
} // namespace VisuFlow
```