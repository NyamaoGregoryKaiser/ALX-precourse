#include "RateLimitingMiddleware.h"
#include "../logger/Logger.h"
#include "../middleware/ErrorHandlingMiddleware.h" // For error response helper

RateLimitingMiddleware::RateLimitingMiddleware() : _rate_limit_rpm(AppConfig::get_instance().rate_limit_requests_per_minute) {}

void RateLimitingMiddleware::before_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx) {
    if (_rate_limit_rpm <= 0) { // Rate limiting disabled
        return;
    }

    std::string client_ip = req.remote_ip_address;
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(_mutex);

    // Clean up old entries (simple strategy, not highly performant for many IPs)
    for (auto it = _last_request_time.begin(); it != _last_request_time.end(); ) {
        if (now - it->second > std::chrono::minutes(1)) {
            it = _last_request_time.erase(it);
            _request_count.erase(it->first); // Erase corresponding count
        } else {
            ++it;
        }
    }

    if (_request_count.find(client_ip) == _request_count.end() ||
        (now - _last_request_time[client_ip] > std::chrono::minutes(1))) {
        // First request in a minute or a new minute started
        _request_count[client_ip] = 1;
        _last_request_time[client_ip] = now;
    } else {
        _request_count[client_ip]++;
        if (_request_count[client_ip] > _rate_limit_rpm) {
            Logger::get_logger()->warn("Rate limit exceeded for IP: {}", client_ip);
            res.code = 429; // Too Many Requests
            res.add_header("Retry-After", "60"); // Tell client to retry after 60 seconds
            res.write(ErrorHandlingMiddleware::create_error_response("Rate limit exceeded. Too many requests.", 429, "RATE_LIMIT_EXCEEDED").dump());
            res.end();
            return; // Stop processing this request
        }
    }
}

void RateLimitingMiddleware::after_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx) {
    // No specific post-processing for rate limiting in this simple example.
}