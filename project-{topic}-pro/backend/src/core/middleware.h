#pragma once
#include <pistache/http.h>
#include <pistache/router.h>
#include <pistache/endpoint.h>
#include <functional>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include <memory>
#include "spdlog/spdlog.h"
#include "../utils/jwt_manager.h"
#include "server.h" // For MiddlewareFunc

// Custom Exception for API errors
class ApiException : public std::runtime_error {
public:
    Pistache::Http::Code status_code;
    std::string details;

    ApiException(Pistache::Http::Code code, const std::string& msg, const std::string& details = "")
        : std::runtime_error(msg), status_code(code), details(details) {}
};

namespace RequestLoggerMiddleware {
    void log_request(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next);
}

namespace RateLimitingMiddleware {
    void rate_limit(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next);
}

namespace ErrorHandlingMiddleware {
    void handle_exceptions(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next);
}

namespace AuthMiddleware {
    void authenticate(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next, JWTManager& jwtManager);
}

// Caching (simple in-memory example)
namespace CacheMiddleware {
    // For a real cache, this would be more sophisticated (e.g., LRU, thread-safe, external Redis)
    extern std::unordered_map<std::string, std::pair<std::string, std::chrono::steady_clock::time_point>> cache_store;
    extern std::mutex cache_mutex;

    void serve_from_cache(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next);
    void update_cache(const std::string& key, const std::string& value, std::chrono::seconds expiry);
}