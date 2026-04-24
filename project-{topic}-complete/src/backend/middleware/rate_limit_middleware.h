```cpp
#ifndef ECOMMERCE_RATE_LIMIT_MIDDLEWARE_H
#define ECOMMERCE_RATE_LIMIT_MIDDLEWARE_H

#include "crow.h"
#include <chrono>
#include <map>
#include <string>
#include <mutex>
#include <spdlog/spdlog.h>

class RateLimitMiddleware {
public:
    struct Context {}; // No specific context needed for this simple rate limiter

    RateLimitMiddleware(int max_requests = 100, int window_seconds = 60)
        : max_requests_(max_requests), window_seconds_(window_seconds), logger_(spdlog::get("ecommerce_logger")) {
        if (!logger_) {
            logger_ = spdlog::stdout_color_mt("rate_limit_middleware_logger");
        }
    }

    void before_handle(crow::request& req, crow::response& res, Context& ctx) {
        std::string ip_address = req.remote_ip_address; // Use remote_ip_address for simplicity

        // Acquire lock before accessing shared data (ip_requests_)
        std::lock_guard<std::mutex> lock(mtx_);

        auto now = std::chrono::steady_clock::now();
        auto& requests = ip_requests_[ip_address];

        // Remove old requests outside the current window
        requests.erase(std::remove_if(requests.begin(), requests.end(),
            [&](const std::chrono::steady_clock::time_point& timestamp) {
                return std::chrono::duration_cast<std::chrono::seconds>(now - timestamp).count() > window_seconds_;
            }),
            requests.end());

        if (requests.size() >= max_requests_) {
            // Rate limit exceeded
            logger_->warn("Rate limit exceeded for IP: {}. {} requests in {} seconds.", ip_address, requests.size(), window_seconds_);
            res.code = 429;
            res.add_header("Retry-After", std::to_string(window_seconds_)); // Inform client when to retry
            res.write("{\"message\": \"Too Many Requests\"}");
            res.end(); // End the request early
        } else {
            // Add current request timestamp
            requests.push_back(now);
        }
    }

    void after_handle(crow::request& req, crow::response& res, Context& ctx) {
        // No post-processing needed for rate limiting
    }

private:
    int max_requests_;
    int window_seconds_;
    std::map<std::string, std::vector<std::chrono::steady_clock::time_point>> ip_requests_;
    std::mutex mtx_; // Mutex for protecting access to ip_requests_
    std::shared_ptr<spdlog::logger> logger_;
};

#endif // ECOMMERCE_RATE_LIMIT_MIDDLEWARE_H
```