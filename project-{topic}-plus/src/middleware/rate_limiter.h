#pragma once

#include <pistache/http.h>
#include <pistache/router.h>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include <vector>

#include "src/utils/logger.h"
#include "src/utils/exceptions.h"
#include "src/config/config.h"

// A simple fixed-window rate limiter middleware.
// Tracks request counts for each IP address within a fixed time window.
class RateLimiter {
public:
    RateLimiter(int window_seconds, int max_requests);

    // Middleware function to apply rate limiting
    void limit(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next);

private:
    int window_seconds_;
    int max_requests_;

    struct ClientData {
        long current_window_start; // Unix timestamp of the start of the current window
        int request_count;         // Number of requests in the current window
    };

    std::unordered_map<std::string, ClientData> clients_;
    mutable std::mutex mutex_; // Mutex to protect client_map access

    // Helper to get client IP address
    std::string get_client_ip(const Pistache::Rest::Request& request) const;
};
```