```cpp
#include "LoggingMiddleware.h"
#include <chrono>

void LoggingMiddleware::before_handle(crow::request& req, crow::response& res, context& ctx) {
    // Store request start time in the context (or directly in res if a dedicated field exists)
    // For simplicity, we'll log before and after. For precise timing, custom context is better.
    // Crow's request object has `start` time.
    Logger::info("Request -> {} {} from {} (User-Agent: {})",
                 req.method_string(), req.url, req.remote_ip_address, req.get_header("User-Agent"));
}

void LoggingMiddleware::after_handle(crow::request& req, crow::response& res, context& ctx) {
    // Calculate request duration if start time was captured
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::high_resolution_clock::now() - req.start).count();

    Logger::info("Response <- {} {} {} (Status: {}, Duration: {}ms)",
                 req.method_string(), req.url, req.remote_ip_address, res.code, duration);
}
```