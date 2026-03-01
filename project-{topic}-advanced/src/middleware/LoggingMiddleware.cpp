#include "LoggingMiddleware.h"
#include <drogon/drogon.h>
#include <iostream>

void LoggingMiddleware::doFilter(const drogon::HttpRequestPtr& req,
                                 drogon::FilterCallback&& fc_success,
                                 drogon::FilterCallback&& fc_fail) {
    // Log incoming request
    LOG_INFO << "Request: " << req->getMethodString() << " " << req->getPath()
             << " from IP: " << req->peerAddr().toIpString();

    // Pass the request to the next filter/controller
    fc_success(req);

    // After response is sent (not directly possible in doFilter like Express.js)
    // Drogon handles response logging generally, or you'd integrate a custom logger
    // into the response callback if you needed to log response details with the request.
    // For simplicity, we just log the request itself.
}
```