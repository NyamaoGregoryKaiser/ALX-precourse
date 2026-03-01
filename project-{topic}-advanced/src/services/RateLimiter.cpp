#include "RateLimiter.h"
#include <drogon/drogon.h> // For LOG_DEBUG

namespace RateLimiter {

    std::unordered_map<std::string, RateLimitEntry> ipRequestCounts_;
    std::mutex rateLimitMutex_;
    int maxRequests_ = 100;
    int windowSeconds_ = 60;

    void init(int maxRequests, int windowSeconds) {
        if (maxRequests > 0) maxRequests_ = maxRequests;
        if (windowSeconds > 0) windowSeconds_ = windowSeconds;
        LOG_DEBUG << "RateLimiter initialized: " << maxRequests_ << " requests per " << windowSeconds_ << "s.";
    }

    bool allowRequest(const std::string& ipAddress) {
        if (ipAddress.empty()) {
            return true; // Or handle as an error if IP is mandatory
        }

        std::lock_guard<std::mutex> lock(rateLimitMutex_);
        auto now = std::chrono::steady_clock::now();

        auto& entry = ipRequestCounts_[ipAddress]; // Creates if not exists

        if (entry.windowStartTime == std::chrono::steady_clock::time_point()) {
            // First request for this IP or after cleanup
            entry.windowStartTime = now;
            entry.count = 1;
            return true;
        }

        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - entry.windowStartTime).count();

        if (elapsed >= windowSeconds_) {
            // Window has expired, reset count and start new window
            entry.windowStartTime = now;
            entry.count = 1;
            return true;
        } else {
            // Within current window
            if (entry.count < maxRequests_) {
                entry.count++;
                return true;
            } else {
                // Rate limited
                LOG_WARN << "Rate limit exceeded for IP: " << ipAddress;
                return false;
            }
        }
    }

    bool getRateLimitStatus(const std::string& ipAddress, int& outCount, int& outResetTime) {
        std::lock_guard<std::mutex> lock(rateLimitMutex_);
        auto it = ipRequestCounts_.find(ipAddress);
        if (it != ipRequestCounts_.end()) {
            const auto& entry = it->second;
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - entry.windowStartTime).count();

            if (elapsed >= windowSeconds_) {
                outCount = 0; // Effectively reset
                outResetTime = 0;
            } else {
                outCount = entry.count;
                outResetTime = windowSeconds_ - elapsed;
            }
            return true;
        }
        outCount = 0;
        outResetTime = windowSeconds_; // Default for new IP
        return false;
    }

    void cleanup() {
        std::lock_guard<std::mutex> lock(rateLimitMutex_);
        auto now = std::chrono::steady_clock::now();
        for (auto it = ipRequestCounts_.begin(); it != ipRequestCounts_.end(); ) {
            auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - it->second.windowStartTime).count();
            if (elapsed >= windowSeconds_) {
                LOG_DEBUG << "Cleaning up expired rate limit entry for IP: " << it->first;
                it = ipRequestCounts_.erase(it);
            } else {
                ++it;
            }
        }
    }

} // namespace RateLimiter
```