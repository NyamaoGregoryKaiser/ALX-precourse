#ifndef RATE_LIMITING_MIDDLEWARE_H
#define RATE_LIMITING_MIDDLEWARE_H

#include <crow.h>
#include <string>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include "../config/AppConfig.h"

// For a real production system, this would typically integrate with Redis
// or a distributed rate-limiting service. For demonstration, we use an in-memory map.

struct RateLimitingMiddleware {
    RateLimitingMiddleware();

    void before_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx);
    void after_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx);

private:
    std::unordered_map<std::string, std::chrono::steady_clock::time_point> _last_request_time;
    std::unordered_map<std::string, int> _request_count;
    std::mutex _mutex;
    const int _rate_limit_rpm; // Requests per minute
};

#endif // RATE_LIMITING_MIDDLEWARE_H