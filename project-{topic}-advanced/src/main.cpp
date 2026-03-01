#include <drogon/drogon.h>
#include <drogon/HttpAppFramework.h>
#include <drogon/orm/DbClient.h>
#include "controllers/AuthController.h"
#include "controllers/UserController.h"
#include "controllers/WebController.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorHandler.h"
#include "middleware/LoggingMiddleware.h"
#include "middleware/RateLimiterFilter.h"
#include "services/CacheService.h"
#include "services/RateLimiter.h"
#include "constants/AppConstants.h"

int main() {
    // Load config file
    drogon::app().loadConfigFile("../config/default.json");

    // Get database client instance
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Failed to get database client. Check database configuration in config/default.json";
        return 1;
    }

    // Initialize services
    CacheService::init(AppConstants::CACHE_TTL_SECONDS);
    RateLimiter::init(AppConstants::RATE_LIMIT_REQUESTS_PER_WINDOW, AppConstants::RATE_LIMIT_WINDOW_SECONDS);

    // Register controllers
    drogon::app().registerController(std::make_shared<AuthController>(dbClient));
    drogon::app().registerController(std::make_shared<UserController>(dbClient));
    drogon::app().registerController(std::make_shared<WebController>());

    // Register filters (middleware)
    // IMPORTANT: Order matters. Logging/RateLimiting usually before Auth.
    drogon::app().registerFilter("LoggingMiddleware", std::make_shared<LoggingMiddleware>());
    drogon::app().registerFilter("RateLimiterFilter", std::make_shared<RateLimiterFilter>());
    drogon::app().registerFilter("AuthMiddleware", std::make_shared<AuthMiddleware>(dbClient));

    // Set up custom error handler
    drogon::app().setCustomErrorHandler(ErrorHandler::customErrorHandler);

    // Set static files directory (for CSS, JS, etc.)
    drogon::app().set ) ("client/public");

    // Set DView templates directory
    drogon::app().setDocumentRoot("client/views");

    // Optional: Periodically clean up cache and rate limiter
    drogon::app().setInterval(5.0, [](){
        CacheService::cleanup();
        RateLimiter::cleanup();
    });

    // Run Drogon application
    LOG_INFO << "Auth System started on port " << drogon::app().get<int>("listening_port") << ".";
    drogon::app().run();

    return 0;
}
```