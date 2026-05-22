```cpp
#include "RateLimitMiddleware.h"
#include "utils/Logger.h"
#include <algorithm>

RateLimitMiddleware::RateLimitMiddleware() {
    rate_limit_enabled = Config::get<bool>("RATE_LIMIT_ENABLED", false);
    window_seconds = Config::get<int>("RATE_LIMIT_WINDOW_SECONDS", 60);
    max_requests = Config::get<int>("RATE_LIMIT_MAX_REQUESTS", 100);
    LOG_INFO("Rate Limiting: Enabled={}, Window={}s, MaxRequests={}",
             rate_limit_enabled, window_seconds, max_requests);
}

void RateLimitMiddleware::handle(const Pistache::Rest::Request& request) {
    if (!rate_limit_enabled) {
        return;
    }

    std::string client_ip = getClientIp(request);
    auto now = std::chrono::system_clock::now();

    std::lock_guard<std::mutex> lock(mutex);

    // Clean up expired entries (simple, could be optimized with a background thread)
    cleanupExpiredRequests();

    RequestLog& log = client_requests[client_ip];

    if (log.count == 0 || std::chrono::duration_cast<std::chrono::seconds>(now - log.timestamp).count() > window_seconds) {
        // Reset counter if window expired or new client
        log.timestamp = now;
        log.count = 1;
        LOG_DEBUG("Rate limit reset for IP: {}. Count: {}", client_ip, log.count);
    } else {
        log.count++;
        LOG_DEBUG("Rate limit count for IP: {}. Count: {}", client_ip, log.count);
        if (log.count > max_requests) {
            long retry_after = window_seconds - std::chrono::duration_cast<std::chrono::seconds>(now - log.timestamp).count();
            LOG_WARN("Rate limit exceeded for IP: {}. Max requests: {}, Current: {}",
                     client_ip, max_requests, log.count);
            throw HttpError(Pistache::Http::Code::Too_Many_Requests,
                            "Too many requests. Please try again after " + std::to_string(std::max(0L, retry_after)) + " seconds.");
        }
    }
}

std::string RateLimitMiddleware::getClientIp(const Pistache::Rest::Request& request) {
    // Check X-Forwarded-For header first if behind a proxy
    auto forwarded_for = request.headers().tryGet<Pistache::Http::Header::CustomHeader>("X-Forwarded-For");
    if (forwarded_for) {
        return forwarded_for->value();
    }
    // Fallback to direct client IP
    return request.address().host();
}

void RateLimitMiddleware::cleanupExpiredRequests() {
    auto now = std::chrono::system_clock::now();
    for (auto it = client_requests.begin(); it != client_requests.end(); ) {
        if (std::chrono::duration_cast<std::chrono::seconds>(now - it->second.timestamp).count() > window_seconds) {
            it = client_requests.erase(it);
        } else {
            ++it;
        }
    }
}
```