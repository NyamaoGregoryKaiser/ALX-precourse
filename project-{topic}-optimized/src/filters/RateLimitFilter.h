```cpp
#pragma once

#include <drogon/HttpFilter.h>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include "../utils/ApiResponse.h"

// Struct to hold request count and last reset time for an IP
struct RequestInfo {
    int count;
    std::chrono::steady_clock::time_point lastReset;
};

class RateLimitFilter : public drogon::HttpFilter<RateLimitFilter> {
public:
    RateLimitFilter();

    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) override;

private:
    std::unordered_map<std::string, RequestInfo> ipRequestCounts_;
    std::mutex mutex_;
    int limit_; // Max requests per window
    int windowSeconds_; // Window duration in seconds
};
```