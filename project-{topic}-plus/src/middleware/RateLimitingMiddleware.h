```cpp
#ifndef RATE_LIMITING_MIDDLEWARE_H
#define RATE_LIMITING_MIDDLEWARE_H

#include <crow.h>
#include <chrono>
#include <string>
#include <map>
#include <mutex>
#include "../utils/Logger.h"
#include "../exceptions/CustomExceptions.h"
#include "../config/AppConfig.h"

namespace TaskManager {
namespace Middleware {

struct RateLimitingMiddleware {
    RateLimitingMiddleware(Config::AppConfig& config);

    struct context {}; // No specific context data needed for this middleware

    template <typename Next>
    void call(crow::request& req, crow::response& res, Next&& next) {
        if (!rate_limit_enabled_) {
            next(req, res);
            return;
        }

        std::string client_ip = req.get_header("X-Forwarded-For");
        if (client_ip.empty()) {
            client_ip = req.remote_ip_address;
        }

        auto now = std::chrono::steady_clock::now();
        std::lock_guard<std::mutex> lock(ip_requests_mutex_);

        // Clean up expired entries
        for (auto it = ip_requests_.begin(); it != ip_requests_.end(); ) {
            if (now - it->second.first > rate_limit_window_) {
                it = ip_requests_.erase(it);
            } else {
                ++it;
            }
        }

        auto& entry = ip_requests_[client_ip]; // Pair of (last_request_time, request_count)
        entry.first = now; // Update last request time for cleanup logic

        if (entry.second < rate_limit_max_requests_) {
            entry.second++;
            next(req, res);
            // After successful request, set rate limit headers
            long long remaining = rate_limit_max_requests_ - entry.second;
            long long reset_in_seconds = std::chrono::duration_cast<std::chrono::seconds>(rate_limit_window_ - (now - entry.first)).count();
            if (reset_in_seconds < 0) reset_in_seconds = 0;

            res.set_header("X-RateLimit-Limit", std::to_string(rate_limit_max_requests_));
            res.set_header("X-RateLimit-Remaining", std::to_string(remaining));
            res.set_header("X-RateLimit-Reset", std::to_string(reset_in_seconds));
        } else {
            Utils::Logger::getLogger()->warn("Rate limit exceeded for IP: {}", client_ip);
            res.code = crow::status::TOO_MANY_REQUESTS; // HTTP 429
            res.set_header("Content-Type", "application/json");
            res.write(nlohmann::json{{"error", "Too Many Requests."}, {"code", 429}}.dump());
            
            long long reset_in_seconds = std::chrono::duration_cast<std::chrono::seconds>(rate_limit_window_ - (now - entry.first)).count();
            if (reset_in_seconds < 0) reset_in_seconds = 0;
            res.set_header("Retry-After", std::to_string(reset_in_seconds));
            res.set_header("X-RateLimit-Limit", std::to_string(rate_limit_max_requests_));
            res.set_header("X-RateLimit-Remaining", "0");
            res.set_header("X-RateLimit-Reset", std::to_string(reset_in_seconds));
            res.end();
        }
    }

private:
    bool rate_limit_enabled_;
    int rate_limit_max_requests_;
    std::chrono::steady_clock::duration rate_limit_window_;
    mutable std::mutex ip_requests_mutex_;
    // Map IP address to (last_request_time, request_count_in_window)
    std::map<std::string, std::pair<std::chrono::steady_clock::time_point, int>> ip_requests_;
};

} // namespace Middleware
} // namespace TaskManager

#endif // RATE_LIMITING_MIDDLEWARE_H
```