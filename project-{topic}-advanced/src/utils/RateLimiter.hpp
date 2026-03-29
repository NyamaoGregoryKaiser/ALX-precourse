```cpp
#ifndef RATE_LIMITER_HPP
#define RATE_LIMITER_HPP

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include "Logger.hpp"

// Stores request counts and window start time for a given client (IP)
struct ClientRequestData {
    int request_count;
    std::chrono::time_point<std::chrono::steady_clock> window_start;
};

class RateLimiter {
public:
    RateLimiter(int window_seconds, int max_requests);

    // Checks if a request from `client_id` is allowed.
    // Returns true if allowed, false if rate limit exceeded.
    bool allowRequest(const std::string& client_id);

    // Clears all rate limiting data (e.g., for testing or global reset)
    void clear();

private:
    int window_seconds_;
    int max_requests_;
    std::unordered_map<std::string, ClientRequestData> client_data_;
    std::mutex limiter_mutex_;

    // Helper to clean up old entries (optional, can be done periodically or on access)
    void cleanupExpiredEntries();
};

#endif // RATE_LIMITER_HPP
```