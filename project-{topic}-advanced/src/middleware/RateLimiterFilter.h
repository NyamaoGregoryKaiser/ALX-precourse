#ifndef RATE_LIMITER_FILTER_H
#define RATE_LIMITER_FILTER_H

#include <drogon/HttpFilter.h>

// This is a filter to integrate with the RateLimiter service
class RateLimiterFilter : public drogon::HttpFilter<RateLimiterFilter> {
public:
    RateLimiterFilter() {}
    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_success,
                          drogon::FilterCallback&& fc_fail) override;
};

#endif // RATE_LIMITER_FILTER_H
```