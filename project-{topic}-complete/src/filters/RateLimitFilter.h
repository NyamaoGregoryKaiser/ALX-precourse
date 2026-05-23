```cpp
#pragma once

#include <drogon/HttpFilter.h>
#include <unordered_map>
#include <chrono>
#include <mutex>

namespace CMS::Filters {

// Simple in-memory rate limiting based on IP address
class RateLimitFilter : public drogon::HttpFilter<RateLimitFilter> {
public:
    RateLimitFilter(int limit = 100, int windowSeconds = 60);
    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) override;

private:
    struct RequestInfo {
        int count;
        std::chrono::steady_clock::time_point windowStartTime;
    };

    int requestLimit_;
    int windowSeconds_;
    std::unordered_map<std::string, RequestInfo> ipRequestCounts_;
    std::mutex mutex_;

    void cleanUpExpiredEntries();
};

} // namespace CMS::Filters
```