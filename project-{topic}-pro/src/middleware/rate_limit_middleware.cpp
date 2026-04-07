```cpp
#include "rate_limit_middleware.h"
#include "../common/config.h"

namespace Middleware {
    std::mutex RateLimitMiddleware::mutex;
    std::map<std::string, RateLimitInfo> RateLimitMiddleware::clients;
    int RateLimitMiddleware::requestsPerMinute = 0; // Initialized from config
    int RateLimitMiddleware::burstLimit = 0;        // Initialized from config
    std::chrono::seconds RateLimitMiddleware::windowDuration = std::chrono::minutes(1);

    void RateLimitMiddleware::rateLimit(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        static bool initialized = false;
        if (!initialized) {
            requestsPerMinute = Config::getInstance().getInt("rate_limit.requests_per_minute", 60);
            burstLimit = Config::getInstance().getInt("rate_limit.burst", 10);
            Logger::info("RateLimitMiddleware", "Initialized with {} req/min and burst of {}.", requestsPerMinute, burstLimit);
            initialized = true;
        }

        std::string clientIp = request.address().host(); // Get client IP
        long long currentTime = std::chrono::duration_cast<std::chrono::seconds>(
                                std::chrono::system_clock::now().time_since_epoch()).count();

        std::lock_guard<std::mutex> lock(mutex);

        RateLimitInfo& info = clients[clientIp];

        if (info.lastRequestTime == 0) { // First request from this IP
            info.lastRequestTime = currentTime;
            info.requestCount = 1;
            info.burstAvailable = burstLimit - 1; // Used 1 from burst
            Logger::debug("RateLimitMiddleware", "New client {}: first request.", clientIp);
        } else {
            long long timeElapsed = currentTime - info.lastRequestTime;
            
            // Refill burst capacity
            if (timeElapsed >= windowDuration.count() / requestsPerMinute && info.burstAvailable < burstLimit) {
                // Calculate how many tokens to add based on time elapsed and rate
                int tokensToAdd = (int)(timeElapsed * requestsPerMinute / windowDuration.count());
                info.burstAvailable = std::min(burstLimit, info.burstAvailable + tokensToAdd);
                info.lastRequestTime = currentTime; // Reset last request time for token calculation
            } else if (timeElapsed > windowDuration.count()) { // Reset if window passed
                info.lastRequestTime = currentTime;
                info.requestCount = 0; // Reset count for the window
                info.burstAvailable = burstLimit;
            }

            // Check against burst first
            if (info.burstAvailable > 0) {
                info.burstAvailable--;
                info.requestCount++;
                Logger::debug("RateLimitMiddleware", "Client {}: Burst available {}. Request allowed.", clientIp, info.burstAvailable);
            } else if (info.requestCount < requestsPerMinute) {
                // If burst exhausted, check against normal rate limit in the window
                info.requestCount++;
                Logger::debug("RateLimitMiddleware", "Client {}: Burst exhausted. Request count {}. Request allowed.", clientIp, info.requestCount);
            } else {
                Logger::warn("RateLimitMiddleware", "Client {} rate limited. Too many requests.", clientIp);
                response.send(Http::Code::Service_Unavailable, ServiceUnavailableException("Too many requests. Please try again later.").toJson().dump());
                response.headers().add<Pistache::Http::Header::RetryAfter>(std::to_string(windowDuration.count() / requestsPerMinute)); // Suggest retry after ~1 second
                throw Pistache::Http::HttpError(Http::Code::Service_Unavailable);
            }
        }
        // Set X-RateLimit headers (optional, but good practice)
        response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Limit", std::to_string(requestsPerMinute));
        response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Remaining", std::to_string(requestsPerMinute - info.requestCount));
        response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Reset", std::to_string(info.lastRequestTime + windowDuration.count()));
    }
} // namespace Middleware
```