#include "LoggingMiddleware.h"
#include <chrono>

void LoggingMiddleware::before_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx) {
    // Store request start time in context for duration calculation
    req.add_header("X-Request-Start-Time", std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                                        std::chrono::high_resolution_clock::now().time_since_epoch()).count()));
    Logger::get_logger()->info("Request: {} {} from {}", req.method_string(), req.url, req.remote_ip_address);
}

void LoggingMiddleware::after_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx) {
    long start_time_ms = 0;
    auto start_time_header = req.get_header("X-Request-Start-Time");
    if (!start_time_header.empty()) {
        try {
            start_time_ms = std::stoll(start_time_header);
        } catch (...) { /* ignore */ }
    }
    long end_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                            std::chrono::high_resolution_clock::now().time_since_epoch()).count();
    long duration_ms = (start_time_ms > 0) ? (end_time_ms - start_time_ms) : 0;

    Logger::get_logger()->info("Response: {} {} ({} ms) -> Status: {}", req.method_string(), req.url, duration_ms, res.code);
}