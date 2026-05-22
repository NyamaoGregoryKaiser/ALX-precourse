```cpp
#pragma once

#include "pistache/http.h"
#include "pistache/endpoint.h"

#include <chrono>
#include <string>
#include <map>
#include <mutex>
#include <memory> // For std::shared_ptr

#include "config/Config.h" // For rate limit config
#include "middleware/AuthMiddleware.h" // For HttpError

struct RequestLog {
    std::chrono::time_point<std::chrono::system_clock> timestamp;
    int count;
};

class RateLimitMiddleware {
public:
    RateLimitMiddleware();
    void handle(const Pistache::Rest::Request& request);

private:
    std::map<std::string, RequestLog> client_requests;
    std::mutex mutex;

    bool rate_limit_enabled;
    int window_seconds;
    int max_requests;

    std::string getClientIp(const Pistache::Rest::Request& request);
    void cleanupExpiredRequests();
};
```