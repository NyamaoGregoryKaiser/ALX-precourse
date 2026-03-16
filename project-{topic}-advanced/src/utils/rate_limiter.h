```cpp
#ifndef MOBILE_BACKEND_RATE_LIMITER_H
#define MOBILE_BACKEND_RATE_LIMITER_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <vector>
#include <algorithm> // For std::remove_if
#include "logger.h"

namespace mobile_backend {
namespace utils {

// Simple in-memory rate limiter based on IP address
class RateLimiter {
public:
    RateLimiter(int max_requests, std::chrono::seconds window_duration)
        : max_requests_(max_requests), window_duration_(window_duration) {}

    // Check if a request from the given IP address should be allowed
    bool allow_request(const std::string& ip_address) {
        std::lock_guard<std::mutex> lock(ip_requests_mutex_);
        auto now = std::chrono::steady_clock::now();

        // Clean up old timestamps for the IP
        auto& timestamps = ip_requests_[ip_address];
        timestamps.erase(std::remove_if(timestamps.begin(), timestamps.end(),
                                        [&](const auto& ts) {
                                            return now - ts > window_duration_;
                                        }),
                         timestamps.end());

        // Check if the request limit is reached
        if (timestamps.size() >= max_requests_) {
            LOG_WARN("Rate limit exceeded for IP: {} ({} requests in {}s)",
                     ip_address, timestamps.size(), window_duration_.count());
            return false;
        }

        // Add current request timestamp
        timestamps.push_back(now);
        LOG_DEBUG("Rate limiter: Request from IP {} allowed. Count: {}", ip_address, timestamps.size());
        return true;
    }

    // For testing/debugging: get current request count for an IP
    size_t get_request_count(const std::string& ip_address) {
        std::lock_guard<std::mutex> lock(ip_requests_mutex_);
        auto now = std::chrono::steady_clock::now();
        auto& timestamps = ip_requests_[ip_address];
        timestamps.erase(std::remove_if(timestamps.begin(), timestamps.end(),
                                        [&](const auto& ts) {
                                            return now - ts > window_duration_;
                                        }),
                         timestamps.end());
        return timestamps.size();
    }

    // Clear all entries (for testing)
    void clear() {
        std::lock_guard<std::mutex> lock(ip_requests_mutex_);
        ip_requests_.clear();
        LOG_DEBUG("Rate limiter: All entries cleared.");
    }

private:
    int max_requests_;
    std::chrono::seconds window_duration_;
    std::unordered_map<std::string, std::vector<std::chrono::steady_clock::time_point>> ip_requests_;
    mutable std::mutex ip_requests_mutex_; // Mutex to protect ip_requests_ map
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_RATE_LIMITER_H
```