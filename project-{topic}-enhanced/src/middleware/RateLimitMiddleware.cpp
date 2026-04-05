```cpp
#include "RateLimitMiddleware.hpp"
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp"

#include <chrono>
#include <string>
#include <mutex>

RateLimitMiddleware::RateLimitMiddleware()
    : enabled(false), maxRequests(0), windowSeconds(0) {}

// Configures the rate limiter.
void RateLimitMiddleware::configure(bool enabled, int maxRequests, int windowSeconds) {
    this->enabled = enabled;
    this->maxRequests = maxRequests;
    this->windowSeconds = windowSeconds;
    if (enabled) {
        Logger::info("RateLimitMiddleware: Enabled with {} requests per {} seconds.", maxRequests, windowSeconds);
    } else {
        Logger::info("RateLimitMiddleware: Disabled.");
    }
}

// This function is called for every request before routing.
void RateLimitMiddleware::before_handle(crow::request& req, crow::response& res, Context& ctx) {
    if (!enabled) {
        return; // Rate limiting is disabled
    }

    std::string ip = req.remote_ip_address;
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(mtx);

    // Clean up old entries from rateLimitData map
    // (A more sophisticated approach would be a background thread or a smarter data structure)
    for (auto it = rateLimitData.begin(); it != rateLimitData.end(); ) {
        if (std::chrono::duration_cast<std::chrono::seconds>(now - it->second.windowStart).count() >= windowSeconds) {
            it = rateLimitData.erase(it);
        } else {
            ++it;
        }
    }

    if (rateLimitData.find(ip) == rateLimitData.end()) {
        // First request from this IP in the current window
        rateLimitData[ip] = {1, now};
    } else {
        // Subsequent requests
        auto& entry = rateLimitData[ip];
        
        // Check if the current request is within the current window
        if (std::chrono::duration_cast<std::chrono::seconds>(now - entry.windowStart).count() < windowSeconds) {
            entry.requestCount++;
            if (entry.requestCount > maxRequests) {
                // Rate limit exceeded
                Logger::warn("RateLimitMiddleware: IP {} exceeded rate limit ({} requests in {}s).", ip, entry.requestCount, windowSeconds);
                throw TooManyRequestsException("Too many requests. Please try again later.");
            }
        } else {
            // Window expired, reset for this IP
            entry = {1, now};
        }
    }
    Logger::debug("RateLimitMiddleware: IP {} - Request count: {}", ip, rateLimitData[ip].requestCount);
}

// This function is called after the route handler.
void RateLimitMiddleware::after_handle(crow::request& req, crow::response& res, Context& ctx) {
    // No specific post-processing for rate limiting needed here for this example.
    // Can be used to add rate-limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
    // to the response, which is a good practice.
}
```