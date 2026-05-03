```cpp
#ifndef MLTOOLKIT_LOGGING_MIDDLEWARE_HPP
#define MLTOOLKIT_LOGGING_MIDDLEWARE_HPP

#include <crow.h>
#include "../common/Logger.hpp"
#include <chrono>

namespace MLToolkit {
namespace Middleware {

class LoggingMiddleware {
public:
    struct context {}; // Crow context struct

    LoggingMiddleware() = default;

    void before_handle(crow::request& req, crow::response& /*res*/, context& ctx) {
        auto start = std::chrono::high_resolution_clock::now();
        req.add_context<decltype(start)>(start); // Store start time in request context
        LOG_INFO("Request received: Method={} Path={} From={}:{}", req.method_string(), req.url, req.remote_ip_address, req.remote_port);
        LOG_DEBUG("Request Headers: {}", crow::json::dump(req.headers));
        if (req.body.length() > 0) {
            LOG_DEBUG("Request Body: {}", req.body);
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& /*ctx*/) {
        auto end = std::chrono::high_resolution_clock::now();
        auto start = req.get_context<decltype(end)>();
        auto duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

        LOG_INFO("Request finished: Method={} Path={} Status={} Latency={}ms", 
                 req.method_string(), req.url, res.code, duration_ms);
        LOG_DEBUG("Response Headers: {}", crow::json::dump(res.headers));
        if (res.body.length() > 0) {
            LOG_DEBUG("Response Body: {}", res.body);
        }
    }
};

} // namespace Middleware
} // namespace MLToolkit

#endif // MLTOOLKIT_LOGGING_MIDDLEWARE_HPP
```