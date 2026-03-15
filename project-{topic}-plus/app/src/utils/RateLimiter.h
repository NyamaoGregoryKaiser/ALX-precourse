#ifndef RATE_LIMITER_H
#define RATE_LIMITER_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include "Logger.h"
#include "../app_config.h"

namespace RateLimiting {

    // Request tracking structure for a fixed window
    struct RequestWindow {
        std::chrono::steady_clock::time_point window_start;
        int request_count;
    };

    class FixedWindowRateLimiter {
    private:
        std::unordered_map<std::string, RequestWindow> client_requests;
        std::mutex limiter_mutex;
        int max_requests;
        std::chrono::seconds window_size;

    public:
        FixedWindowRateLimiter(int max_req = AppConfig::RATE_LIMIT_MAX_REQUESTS,
                               std::chrono::seconds window_s = AppConfig::RATE_LIMIT_WINDOW_SECONDS)
            : max_requests(max_req), window_size(window_s) {
            LOG_INFO("RateLimiter initialized: max_requests={}, window_size={}s", max_requests, window_size.count());
        }

        /**
         * @brief Checks if a client (identified by `key`, e.g., IP address) has exceeded the rate limit.
         * Updates the request count for the current window.
         * @param key The identifier for the client (e.g., IP address, user ID).
         * @return True if the request is allowed, false if rate-limited.
         */
        bool allowRequest(const std::string& key) {
            if (!AppConfig::RATE_LIMIT_ENABLED) {
                return true; // Rate limiting is disabled
            }

            std::lock_guard<std::mutex> lock(limiter_mutex);
            auto now = std::chrono::steady_clock::now();

            auto it = client_requests.find(key);
            if (it == client_requests.end()) {
                // First request for this client in any window
                client_requests[key] = {now, 1};
                LOG_DEBUG("RateLimiter: First request for key='{}'", key);
                return true;
            }

            RequestWindow& window = it->second;

            // Check if current window has expired
            if (now > window.window_start + window_size) {
                // Start a new window
                window.window_start = now;
                window.request_count = 1;
                LOG_DEBUG("RateLimiter: New window for key='{}', count=1", key);
                return true;
            } else {
                // Within the current window
                if (window.request_count < max_requests) {
                    window.request_count++;
                    LOG_DEBUG("RateLimiter: Key='{}', count={}/{}", key, window.request_count, max_requests);
                    return true;
                } else {
                    // Rate limit exceeded
                    LOG_WARN("RateLimiter: Key='{}' EXCEEDED limit ({}/{})", key, window.request_count, max_requests);
                    return false;
                }
            }
        }

        /**
         * @brief Cleans up expired windows to prevent map from growing indefinitely.
         * This can be called periodically or less frequently.
         */
        void cleanupExpiredWindows() {
            std::lock_guard<std::mutex> lock(limiter_mutex);
            auto now = std::chrono::steady_clock::now();
            size_t initial_size = client_requests.size();

            for (auto it = client_requests.begin(); it != client_requests.end(); ) {
                if (now > it->second.window_start + window_size) {
                    it = client_requests.erase(it);
                } else {
                    ++it;
                }
            }
            if (client_requests.size() < initial_size) {
                LOG_DEBUG("RateLimiter: Cleaned up expired windows. {} items removed.", initial_size - client_requests.size());
            }
        }
    };

    // Global rate limiter instance
    inline FixedWindowRateLimiter app_rate_limiter(AppConfig::RATE_LIMIT_MAX_REQUESTS, AppConfig::RATE_LIMIT_WINDOW_SECONDS);

} // namespace RateLimiting

#endif // RATE_LIMITER_H