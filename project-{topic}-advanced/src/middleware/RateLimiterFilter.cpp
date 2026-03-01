#include "RateLimiterFilter.h"
#include "../services/RateLimiter.h"
#include "../constants/AppConstants.h"
#include "../utils/JsonUtil.h"
#include <drogon/drogon.h>

void RateLimiterFilter::doFilter(const drogon::HttpRequestPtr& req,
                                 drogon::FilterCallback&& fc_success,
                                 drogon::FilterCallback&& fc_fail) {
    std::string clientIp = req->peerAddr().toIpString();

    if (RateLimiter::allowRequest(clientIp)) {
        fc_success(req);
    } else {
        int count, resetTime;
        RateLimiter::getRateLimitStatus(clientIp, count, resetTime);

        auto resp = JsonUtil::createErrorResponse(drogon::k429TooManyRequests, AppConstants::ERR_TOO_MANY_REQUESTS);
        resp->addHeader("X-RateLimit-Limit", std::to_string(AppConstants::RATE_LIMIT_REQUESTS_PER_WINDOW));
        resp->addHeader("X-RateLimit-Remaining", std::to_string(0)); // Already hit limit
        resp->addHeader("X-RateLimit-Reset", std::to_string(resetTime)); // Time until reset
        fc_fail(resp);
    }
}
```