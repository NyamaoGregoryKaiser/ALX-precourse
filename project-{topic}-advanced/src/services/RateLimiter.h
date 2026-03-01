#ifndef RATE_LIMITER_H
#define RATE_LIMITER_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <utility> // For std::pair

namespace RateLimiter {

    struct RateLimitEntry {
        int count;
        std::chrono::steady_clock::time_point windowStartTime;
    };

    // Global map for IP-based rate limiting
    extern std::unordered_map<std::string, RateLimitEntry> ipRequestCounts_;
    extern std::mutex rateLimitMutex_;
    extern int maxRequests_;
    extern int windowSeconds_;

    /**
     * @brief Initializes the rate limiter with global limits.
     * @param maxRequests Maximum number of requests allowed within the window.
     * @param windowSeconds Duration of the rate limit window in seconds.
     */
    void init(int maxRequests, int windowSeconds);

    /**
     * @brief Checks if an IP address has exceeded the rate limit.
     *        If not, increments the request count.
     * @param ipAddress The IP address of the client.
     * @return True if the request is allowed, false if rate limited.
     */
    bool allowRequest(const std::string& ipAddress);

    /**
     * @brief Retrieves the current state of rate limiting for an IP.
     * @param ipAddress The IP address.
     * @param outCount Output parameter for current request count.
     * @param outResetTime Output parameter for when the window resets (in seconds).
     * @return True if an entry exists for the IP, false otherwise.
     */
    bool getRateLimitStatus(const std::string& ipAddress, int& outCount, int& outResetTime);

    /**
     * @brief Cleans up expired entries from the rate limiter map.
     */
    void cleanup();

} // namespace RateLimiter

#endif // RATE_LIMITER_H
```