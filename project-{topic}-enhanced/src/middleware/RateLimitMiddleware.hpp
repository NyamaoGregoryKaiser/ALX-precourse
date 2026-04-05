```cpp
#ifndef RATE_LIMIT_MIDDLEWARE_HPP
#define RATE_LIMIT_MIDDLEWARE_HPP

#include "crow.h"
#include <string>
#include <chrono>
#include <map>
#include <mutex>

// RateLimitMiddleware class. Inherits from crow::IMiddleware.
// Implements a fixed-window rate limiting algorithm.
class RateLimitMiddleware : public crow::IMiddleware {
public:
    // Context structure. Not strictly necessary for this middleware,
    // but every Crow middleware needs one.
    struct Context {
        // No specific context data needed for this middleware
    };

    // Constructor.
    RateLimitMiddleware();

    // Configures the rate limiter's parameters.
    void configure(bool enabled, int maxRequests, int windowSeconds);

    // This method is called before the route handler.
    // It checks and enforces rate limits.
    void before_handle(crow::request& req, crow::response& res, Context& ctx);

    // This method is called after the route handler.
    void after_handle(crow::request& req, crow::response& res, Context& ctx);

private:
    bool enabled;
    int maxRequests; // Maximum requests allowed within the window
    int windowSeconds; // Time window in seconds

    // Data structure to store request counts and window start times per IP
    struct RateLimitEntry {
        int requestCount;
        std::chrono::steady_clock::time_point windowStart;
    };
    std::map<std::string, RateLimitEntry> rateLimitData;
    std::mutex mtx; // Mutex to protect access to rateLimitData
};

#endif // RATE_LIMIT_MIDDLEWARE_HPP
```