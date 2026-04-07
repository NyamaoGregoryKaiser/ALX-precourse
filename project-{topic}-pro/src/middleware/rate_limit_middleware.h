```cpp
#ifndef WEBSCRAPER_RATE_LIMIT_MIDDLEWARE_H
#define WEBSCRAPER_RATE_LIMIT_MIDDLEWARE_H

#include <pistache/http.h>
#include <pistache/router.h>
#include "../common/logger.h"
#include "../common/error_handler.h"
#include <string>
#include <chrono>
#include <mutex>
#include <map>

namespace Middleware {
    struct RateLimitInfo {
        long long lastRequestTime; // Unix timestamp in seconds
        int requestCount;
        int burstAvailable;
    };

    class RateLimitMiddleware {
    public:
        static void rateLimit(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    private:
        RateLimitMiddleware() = delete;

        static std::mutex mutex;
        static std::map<std::string, RateLimitInfo> clients;
        static int requestsPerMinute; // Configurable requests per minute
        static int burstLimit;        // Configurable burst capacity
        static std::chrono::seconds windowDuration; // 1 minute
    };
} // namespace Middleware

#endif // WEBSCRAPER_RATE_LIMIT_MIDDLEWARE_H
```