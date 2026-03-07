```cpp
#include "RateLimitFilter.h"

RateLimitFilter::RateLimitFilter() {
    // Retrieve rate limit settings from app config.
    const Json::Value &filterConfig = drogon::app().get >("filters")["RateLimitFilter"];
    if (filterConfig.isMember("limit") && filterConfig["limit"].isInt()) {
        limit_ = filterConfig["limit"].asInt();
    } else {
        limit_ = 100; // Default limit
        LOG_WARN << "RateLimitFilter 'limit' not found in config.json. Using default: " << limit_;
    }

    if (filterConfig.isMember("window_seconds") && filterConfig["window_seconds"].isInt()) {
        windowSeconds_ = filterConfig["window_seconds"].asInt();
    } else {
        windowSeconds_ = 60; // Default window
        LOG_WARN << "RateLimitFilter 'window_seconds' not found in config.json. Using default: " << windowSeconds_;
    }
}

void RateLimitFilter::doFilter(const drogon::HttpRequestPtr& req,
                              drogon::FilterCallback&& fc,
                              drogon::FilterChainCallback&& fcc) {
    std::string ip = req->peerAddr().toIpString();
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(mutex_);

    auto it = ipRequestCounts_.find(ip);
    if (it == ipRequestCounts_.end()) {
        ipRequestCounts_[ip] = {1, now};
        fcc(); // First request, allow
    } else {
        RequestInfo& info = it->second;
        auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - info.lastReset).count();

        if (elapsed >= windowSeconds_) {
            // Reset window
            info.count = 1;
            info.lastReset = now;
            fcc();
        } else {
            // Within current window
            if (info.count < limit_) {
                info.count++;
                fcc();
            } else {
                // Rate limit exceeded
                auto resp = ApiResponse::makeErrorResponse("Too many requests. Please try again later.", drogon::k429TooManyRequests, "RATE_LIMITED");
                resp->addHeader("Retry-After", std::to_string(windowSeconds_ - elapsed));
                return fc(resp);
            }
        }
    }
}
```