```cpp
#ifndef MLTOOLKIT_RATE_LIMITER_HPP
#define MLTOOLKIT_RATE_LIMITER_HPP

#include <crow.h>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include "../common/Logger.hpp"

namespace MLToolkit {
namespace Middleware {

class RateLimiter {
public:
    struct context {}; // Crow context struct

    // Capacity: max tokens available in the bucket
    // Fill rate: tokens added per second
    explicit RateLimiter(long capacity = 100, long fill_rate_per_sec = 10)
        : capacity_(capacity), fill_rate_per_ms_(static_cast<double>(fill_rate_per_sec) / 1000.0) {
        LOG_INFO("RateLimiter initialized with capacity {} and fill rate {} tokens/sec.", capacity_, fill_rate_per_sec);
    }

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        std::string client_ip = req.remote_ip_address; // Use IP for rate limiting

        if (!allow_request(client_ip)) {
            LOG_WARN("Rate limit exceeded for IP: {}", client_ip);
            res.code = 429; // Too Many Requests
            res.set_header("Retry-After", "1"); // Suggest client retry after 1 second
            res.write({"error", "Rate limit exceeded. Please try again later."});
            res.end();
            return;
        }
    }

    void after_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
        // No post-processing needed for rate limiting
    }

private:
    struct Bucket {
        long tokens;
        std::chrono::steady_clock::time_point last_refill_time;
    };

    long capacity_; // Max tokens
    double fill_rate_per_ms_; // Tokens per millisecond
    std::unordered_map<std::string, Bucket> buckets_; // IP -> Bucket
    std::mutex mutex_;

    bool allow_request(const std::string& client_ip) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = std::chrono::steady_clock::now();

        Bucket& bucket = buckets_[client_ip]; // Creates new bucket if IP not found
        if (bucket.last_refill_time.time_since_epoch().count() == 0) {
            // New bucket, initialize
            bucket.tokens = capacity_;
            bucket.last_refill_time = now;
            LOG_DEBUG("New rate limit bucket created for IP: {}", client_ip);
        }

        // Refill tokens
        auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(now - bucket.last_refill_time).count();
        if (elapsed_ms > 0) {
            long tokens_to_add = static_cast<long>(elapsed_ms * fill_rate_per_ms_);
            bucket.tokens = std::min(capacity_, bucket.tokens + tokens_to_add);
            bucket.last_refill_time = now;
        }

        // Consume token
        if (bucket.tokens >= 1) {
            bucket.tokens--;
            LOG_DEBUG("Rate limit granted for IP: {}. Remaining tokens: {}", client_ip, bucket.tokens);
            return true;
        }

        LOG_DEBUG("Rate limit denied for IP: {}. No tokens available.", client_ip);
        return false;
    }
};

} // namespace Middleware
} // namespace MLToolkit

#endif // MLTOOLKIT_RATE_LIMITER_HPP
```