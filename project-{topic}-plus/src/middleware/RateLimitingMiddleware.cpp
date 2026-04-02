```cpp
#include "RateLimitingMiddleware.h"

namespace TaskManager {
namespace Middleware {

RateLimitingMiddleware::RateLimitingMiddleware(Config::AppConfig& config) {
    rate_limit_max_requests_ = config.getInt("RATE_LIMIT_MAX_REQUESTS", 100);
    long long window_seconds = config.getLong("RATE_LIMIT_WINDOW_SECONDS", 60);
    rate_limit_window_ = std::chrono::seconds(window_seconds);

    rate_limit_enabled_ = (rate_limit_max_requests_ > 0 && window_seconds > 0);

    if (rate_limit_enabled_) {
        Utils::Logger::getLogger()->info("Rate Limiting enabled: {} requests per {} seconds.",
                                         rate_limit_max_requests_, window_seconds);
    } else {
        Utils::Logger::getLogger()->warn("Rate Limiting disabled due to invalid configuration.");
    }
}

} // namespace Middleware
} // namespace TaskManager
```