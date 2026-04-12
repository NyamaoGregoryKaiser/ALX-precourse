#pragma once

#include "crow.h"
#include "cache/CacheManager.h"
#include "utils/Logger.h"
#include <string>
#include <chrono>

namespace crow {
    class RateLimitMiddleware {
    public:
        RateLimitMiddleware() :
            cache_manager_(CacheManager::get_instance()),
            max_requests_(100), // Default
            window_seconds_(60) // Default
        {}

        void set_redis_connection(const std::string& host, int port, int max_requests, int window_seconds) {
            // CacheManager::init is static, so we can't fully defer connection here.
            // It should be called once globally in main.cpp.
            // This function is for setting the limits.
            max_requests_ = max_requests;
            window_seconds_ = window_seconds;
            if (!cache_manager_.is_initialized()) {
                 LOG_WARN("RateLimitMiddleware: Redis not initialized. Rate limiting will be inoperative.");
            }
        }

        void before_handle(crow::request& req, crow::response& res, crow::context<void>& ctx) {
            if (!cache_manager_.is_initialized()) {
                return; // No rate limiting if Redis is not active
            }

            // Use IP address for rate limiting
            std::string ip_address = req.remote_ip_address;
            std::string rate_key = "ratelimit:" + ip_address;

            // Increment counter and set/reset expiry
            std::optional<std::string> count_str_opt = cache_manager_.get(rate_key);
            long current_count = 0;
            if (count_str_opt) {
                try {
                    current_count = std::stol(count_str_opt.value());
                } catch (const std::exception& e) {
                    LOG_ERROR("RateLimitMiddleware: Failed to parse rate limit count for IP {}: {}", ip_address, e.what());
                }
            }

            if (current_count >= max_requests_) {
                LOG_WARN("RateLimitMiddleware: IP {} rate limited. Request count: {}. URL: {}", ip_address, current_count, req.url);
                res.code = 429; // Too Many Requests
                res.set_header("Retry-After", std::to_string(window_seconds_));
                res.write("{\"error\":\"Too many requests. Please try again later.\"}");
                res.end();
                return;
            }

            // Increment and set expiry. Use Redis INCR and EXPIRE atomically if possible (or LUA script).
            // For hiredis, we'll do two commands for simplicity.
            // A race condition exists here for INCR/EXPIRE if not done atomically,
            // but for basic rate limiting it might be acceptable.
            // hiredis doesn't have a direct INCRBY/EXPIRE combo, often a small Lua script is best here.
            // For now, simple INCR and then SETEX or EXPIRE.
            cache_manager_.set(rate_key, std::to_string(current_count + 1), window_seconds_);
            LOG_DEBUG("RateLimitMiddleware: IP {} request count: {}", ip_address, current_count + 1);
        }

        void after_handle(crow::request& req, crow::response& res, crow::context<void>& ctx) {
            // No specific action needed after handle
        }

    private:
        CacheManager& cache_manager_;
        int max_requests_;
        int window_seconds_;
    };
} // namespace crow