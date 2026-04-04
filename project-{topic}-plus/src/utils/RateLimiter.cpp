#include "RateLimiter.h"
#include "Logger.h"
#include "config/config.h"

namespace tm_api {
namespace utils {

bool RateLimiter::enabled = false;
int RateLimiter::maxRequests = 0;
std::chrono::seconds RateLimiter::windowDuration = std::chrono::seconds(0);
std::unordered_map<std::string, RateLimitEntry> RateLimiter::ipRequestCounts;
std::mutex RateLimiter::limiterMutex;

void RateLimiter::init(bool enable, int requests, int window) {
    enabled = enable;
    maxRequests = requests;
    windowDuration = std::chrono::seconds(window);

    // Override with config values if available and not explicitly passed
    if (Config::isRateLimitEnabled()) {
        enabled = Config::isRateLimitEnabled();
        maxRequests = Config::getRateLimitRequests();
        windowDuration = std::chrono::seconds(Config::getRateLimitWindowSeconds());
    }

    LOG_INFO("RateLimiter initialized. Enabled: {}, Max Requests: {} per {}s.",
             enabled, maxRequests, windowDuration.count());
}

bool RateLimiter::allowRequest(const std::string& ipAddress) {
    if (!enabled) {
        return true;
    }

    std::lock_guard<std::mutex> lock(limiterMutex);
    auto now = std::chrono::steady_clock::now();

    auto it = ipRequestCounts.find(ipAddress);
    if (it == ipRequestCounts.end()) {
        // First request from this IP
        ipRequestCounts[ipAddress] = {1, now};
        LOG_DEBUG("RateLimiter: First request for IP {}. Count: 1.", ipAddress);
        return true;
    }

    RateLimitEntry& entry = it->second;

    // Check if the current window has expired
    if (now > entry.windowStart + windowDuration) {
        // New window, reset count and start time
        entry.count = 1;
        entry.windowStart = now;
        LOG_DEBUG("RateLimiter: New window for IP {}. Count: 1.", ipAddress);
        return true;
    } else {
        // Within the current window
        if (entry.count < maxRequests) {
            entry.count++;
            LOG_DEBUG("RateLimiter: Request allowed for IP {}. Count: {}.", ipAddress, entry.count);
            return true;
        } else {
            // Rate limit exceeded
            LOG_WARN("RateLimiter: Request denied for IP {} (count {} >= max {}).", ipAddress, entry.count, maxRequests);
            return false;
        }
    }
}

void RateLimiter::clear() {
    std::lock_guard<std::mutex> lock(limiterMutex);
    ipRequestCounts.clear();
    LOG_INFO("RateLimiter: Cleared all IP request counts.");
}

} // namespace utils
} // namespace tm_api