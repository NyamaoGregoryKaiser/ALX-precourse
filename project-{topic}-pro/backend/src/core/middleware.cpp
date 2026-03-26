#include "middleware.h"
#include <iostream>

namespace RequestLoggerMiddleware {
    void log_request(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        spdlog::info("[REQUEST] {}: {} from {}", Pistache::Http::methodString(req.method()), req.resource(), req.address().host());
        next();
    }
}

namespace RateLimitingMiddleware {
    // Simple in-memory rate limiting per IP address
    struct RequestStats {
        int count = 0;
        std::chrono::steady_clock::time_point last_reset;
    };

    std::unordered_map<std::string, RequestStats> ip_request_counts;
    std::mutex rate_limit_mutex;
    const int MAX_REQUESTS = 100; // per minute
    const std::chrono::minutes TIME_WINDOW = std::chrono::minutes(1);

    void rate_limit(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        std::string ip = req.address().host();
        std::lock_guard<std::mutex> lock(rate_limit_mutex);

        auto now = std::chrono::steady_clock::now();
        auto& stats = ip_request_counts[ip];

        if (stats.last_reset == std::chrono::steady_clock::time_point() || now - stats.last_reset > TIME_WINDOW) {
            stats.count = 1;
            stats.last_reset = now;
        } else {
            stats.count++;
        }

        if (stats.count > MAX_REQUESTS) {
            spdlog::warn("Rate limit exceeded for IP: {}", ip);
            resp.send(Pistache::Http::Code::Too_Many_Requests, "Rate limit exceeded. Please try again later.");
            return;
        }
        next();
    }
}

namespace ErrorHandlingMiddleware {
    void handle_exceptions(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        try {
            next();
        } catch (const ApiException& e) {
            spdlog::warn("API Exception caught for {}: {} - {}", req.resource(), e.what(), e.details);
            resp.send(e.status_code, e.what() + (e.details.empty() ? "" : ": " + e.details));
        } catch (const Pistache::Http::HttpError& e) {
            // Pistache internal errors (e.g., malformed JSON body)
            spdlog::error("HTTP Error caught for {}: {}", req.resource(), e.what());
            resp.send(e.code(), "Bad Request: " + std::string(e.what()));
        } catch (const std::runtime_error& e) {
            spdlog::error("Runtime error caught for {}: {}", req.resource(), e.what());
            resp.send(Pistache::Http::Code::Internal_Server_Error, "Internal Server Error: " + std::string(e.what()));
        } catch (...) {
            spdlog::critical("Unknown error caught for {}", req.resource());
            resp.send(Pistache::Http::Code::Internal_Server_Error, "An unknown error occurred.");
        }
    }
}

namespace AuthMiddleware {
    void authenticate(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next, JWTManager& jwtManager) {
        // Paths that do not require authentication
        const std::string path = req.resource();
        if (path == "/auth/login" || path == "/auth/register" || path.rfind("/content/public", 0) == 0) {
            next(); // Public route
            return;
        }

        auto auth_header = req.headers().tryGet<Pistache::Http::Header::Authorization>();
        if (!auth_header) {
            spdlog::warn("Authorization header missing for protected route: {}", req.resource());
            throw ApiException(Pistache::Http::Code::Unauthorized, "Authentication required");
        }

        std::string token_str = auth_header->value();
        if (token_str.rfind("Bearer ", 0) == 0) {
            token_str = token_str.substr(7);
        } else {
            spdlog::warn("Invalid Authorization header format for route: {}", req.resource());
            throw ApiException(Pistache::Http::Code::Bad_Request, "Invalid token format");
        }

        try {
            auto decoded_token = jwtManager.decode_token(token_str);
            // Attach user ID or role to the request for downstream controllers/services
            // Pistache doesn't have a direct request context. A common pattern is to use thread-local storage or modify the request object if allowed.
            // For this example, we'll assume a mechanism to pass user info (e.g., a service that can resolve current user based on token).
            // A more robust solution might involve adding a 'user_id' or 'roles' to the Pistache::Rest::Request via a custom header or thread_local storage if acceptable.
            // For now, if decoding succeeds, we proceed.
            // std::string user_id = decoded_token.get_payload_claim("userId").as_string();
            // spdlog::info("Authenticated user ID: {}", user_id);
            // This is where you would perform authorization checks based on roles/permissions.
            // e.g., if (req.resource() == "/admin" && !user_has_role(user_id, "admin")) throw ApiException(...)

            next(); // Token is valid, proceed
        } catch (const jwt::verification_error& e) {
            spdlog::warn("JWT Verification failed: {}", e.what());
            throw ApiException(Pistache::Http::Code::Unauthorized, "Invalid or expired token");
        } catch (const jwt::decode_error& e) {
            spdlog::warn("JWT Decode failed: {}", e.what());
            throw ApiException(Pistache::Http::Code::Unauthorized, "Malformed token");
        } catch (const std::exception& e) {
            spdlog::error("Unexpected error during authentication: {}", e.what());
            throw ApiException(Pistache::Http::Code::Internal_Server_Error, "Authentication error");
        }
    }
}

namespace CacheMiddleware {
    std::unordered_map<std::string, std::pair<std::string, std::chrono::steady_clock::time_point>> cache_store;
    std::mutex cache_mutex;

    void serve_from_cache(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next) {
        std::string cache_key = req.resource(); // Simple key: the URL

        std::lock_guard<std::mutex> lock(cache_mutex);
        if (cache_store.count(cache_key)) {
            auto& [content, expiry] = cache_store[cache_key];
            if (std::chrono::steady_clock::now() < expiry) {
                spdlog::info("Serving {} from cache.", cache_key);
                resp.headers().add<Pistache::Http::Header::Custom>("X-Cache", "HIT");
                resp.send(Pistache::Http::Code::Ok, content);
                return; // Stop processing, served from cache
            } else {
                spdlog::info("Cache expired for {}.", cache_key);
                cache_store.erase(cache_key); // Remove expired entry
            }
        }
        resp.headers().add<Pistache::Http::Header::Custom>("X-Cache", "MISS");
        next(); // Not in cache or expired, proceed to handler
    }

    void update_cache(const std::string& key, const std::string& value, std::chrono::seconds expiry) {
        std::lock_guard<std::mutex> lock(cache_mutex);
        cache_store[key] = {value, std::chrono::steady_clock::now() + expiry};
        spdlog::debug("Cache updated for key: {}", key);
    }
}