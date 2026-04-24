```cpp
#ifndef ECOMMERCE_LOGGING_MIDDLEWARE_H
#define ECOMMERCE_LOGGING_MIDDLEWARE_H

#include "crow.h"
#include <spdlog/spdlog.h>
#include <chrono>

class LoggingMiddleware {
public:
    struct Context {
        std::chrono::high_resolution_clock::time_point start_time;
        // Other context specific to logging, e.g., request ID
    };

    LoggingMiddleware() : logger_(spdlog::get("ecommerce_logger")) {
        if (!logger_) {
            logger_ = spdlog::stdout_color_mt("logging_middleware_logger");
        }
    }

    void before_handle(crow::request& req, crow::response& res, Context& ctx) {
        ctx.start_time = std::chrono::high_resolution_clock::now();
        // Log basic request info
        logger_->info("Request: {} {} from {}", req.method_string(), req.url, req.remote_ip_address);
    }

    void after_handle(crow::request& req, crow::response& res, Context& ctx) {
        auto end_time = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - ctx.start_time).count();

        // Include user_id if authenticated
        std::string user_info = "";
        auto& auth_ctx = req.get_context<AuthMiddleware::UserContext>();
        if (auth_ctx.is_authenticated) {
            user_info = fmt::format(" User: {}({})", auth_ctx.user_id, auth_ctx.user_role);
        }

        logger_->info("Response: {} {} {} {}{}ms", req.method_string(), req.url, res.code, user_info, duration);
    }

private:
    std::shared_ptr<spdlog::logger> logger_;
};

#endif // ECOMMERCE_LOGGING_MIDDLEWARE_H
```