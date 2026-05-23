```cpp
#include "RateLimitFilter.h"
#include <drogon/drogon.h>

namespace CMS::Filters {

RateLimitFilter::RateLimitFilter(int limit, int windowSeconds)
    : requestLimit_(limit), windowSeconds_(windowSeconds) {}

void RateLimitFilter::doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) {
    std::string clientIp = req->peerAddr().toIpString();
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(mutex_);

    // Clean up old entries
    cleanUpExpiredEntries();

    auto it = ipRequestCounts_.find(clientIp);
    if (it == ipRequestCounts_.end()) {
        ipRequestCounts_[clientIp] = {1, now};
        fcc(); // First request from this IP in the window, allow
    } else {
        RequestInfo& info = it->second;
        if (std::chrono::duration_cast<std::chrono::seconds>(now - info.windowStartTime).count() >= windowSeconds_) {
            // New window, reset count
            info.count = 1;
            info.windowStartTime = now;
            fcc();
        } else if (info.count < requestLimit_) {
            // Same window, within limit, increment count
            info.count++;
            fcc();
        } else {
            // Same window, over limit, deny
            LOG_WARN << "Rate limit exceeded for IP: " << clientIp << " on path: " << req->getPath();
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k429TooManyRequests);
            resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
            resp->addHeader("Retry-After", std::to_string(windowSeconds_ - std::chrono::duration_cast<std::chrono::seconds>(now - info.windowStartTime).count()));
            resp->setBody("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
            fc(resp);
        }
    }
}

void RateLimitFilter::cleanUpExpiredEntries() {
    auto now = std::chrono::steady_clock::now();
    for (auto it = ipRequestCounts_.begin(); it != ipRequestCounts_.end(); ) {
        if (std::chrono::duration_cast<std::chrono::seconds>(now - it->second.windowStartTime).count() >= windowSeconds_) {
            it = ipRequestCounts_.erase(it);
        } else {
            ++it;
        }
    }
}

} // namespace CMS::Filters
```