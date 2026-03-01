#ifndef LOGGING_MIDDLEWARE_H
#define LOGGING_MIDDLEWARE_H

#include <drogon/HttpFilter.h>

class LoggingMiddleware : public drogon::HttpFilter<LoggingMiddleware> {
public:
    LoggingMiddleware() {}
    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_success,
                          drogon::FilterCallback&& fc_fail) override;
};

#endif // LOGGING_MIDDLEWARE_H
```