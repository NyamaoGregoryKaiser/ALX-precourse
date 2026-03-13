#ifndef CMS_API_MIDDLEWARE_HPP
#define CMS_API_MIDDLEWARE_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <chrono>
#include <map>
#include <mutex>
#include <string>
#include <algorithm> // for std::remove_if
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../common/config.hpp"

namespace cms::api {

// Global Error Handling Middleware
inline void handle_error(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::exception_ptr exc) {
    try {
        if (exc) {
            std::rethrow_exception(exc);
        }
    } catch (const cms::common::ApiException& e) {
        LOG_WARN("API Exception: {} - {}", e.http_code(), e.what());
        response.send(e.http_code(), nlohmann::json({{"error", e.what()}}).dump(), MIME(Application, Json));
    } catch (const nlohmann::json::exception& e) {
        LOG_ERROR("JSON Parsing/Serialization Error: {}", e.what());
        response.send(Pistache::Http::Code::Bad_Request, nlohmann::json({{"error", "Invalid JSON format: " + std::string(e.what())}}).dump(), MIME(Application, Json));
    } catch (const std::exception& e) {
        LOG_ERROR("Unhandled server error: {}", e.what());
        response.send(Pistache::Http::Code::Internal_Server_Error, nlohmann::json({{"error", "An unexpected error occurred: " + std::string(e.what())}}).dump(), MIME(Application, Json));
    } catch (...) {
        LOG_CRITICAL("Unknown unhandled error occurred.");
        response.send(Pistache::Http::Code::Internal_Server_Error, nlohmann::json({{"error", "An unknown error occurred"}}).dump(), MIME(Application, Json));
    }
}

// Logging Middleware
inline void log_requests(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
    LOG_INFO("Incoming Request: {} {} from {}", req.method(), req.resource(), req.address().host());
    next(req, std::move(response));
    LOG_INFO("Outgoing Response: {} {} {} Status: {}", req.method(), req.resource(), req.address().host(), response.sent_); // Note: response.sent_ is internal, might not be reliable
}

// Rate Limiting Middleware
class RateLimitMiddleware {
public:
    RateLimitMiddleware() {
        const auto& config = cms::common::AppConfig::get_instance();
        enabled_ = config.rate_limit_enabled;
        window_seconds_ = config.rate_limit_window_seconds;
        max_requests_ = config.rate_limit_max_requests;
        LOG_INFO("Rate Limiting: Enabled={}, Window={}s, MaxRequests={}", enabled_, window_seconds_, max_requests_);
    }

    void handle(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
        if (!enabled_) {
            next(req, std::move(response));
            return;
        }

        std::string client_ip = req.address().host();
        auto now = std::chrono::steady_clock::now();
        
        std::lock_guard<std::mutex> lock(mutex_);

        // Clean up old requests
        request_timestamps_[client_ip].erase(
            std::remove_if(request_timestamps_[client_ip].begin(), request_timestamps_[client_ip].end(),
                           [&](const auto& ts) {
                               return std::chrono::duration_cast<std::chrono::seconds>(now - ts).count() > window_seconds_;
                           }),
            request_timestamps_[client_ip].end());

        // Check if limit exceeded
        if (request_timestamps_[client_ip].size() >= max_requests_) {
            LOG_WARN("Rate limit exceeded for IP: {}", client_ip);
            throw cms::common::ApiException(Pistache::Http::Code::Too_Many_Requests, "Too many requests. Please try again later.");
        }

        // Add current request timestamp
        request_timestamps_[client_ip].push_back(now);
        next(req, std::move(response));
    }

private:
    bool enabled_;
    int window_seconds_;
    int max_requests_;
    std::map<std::string, std::vector<std::chrono::steady_clock::time_point>> request_timestamps_;
    std::mutex mutex_;
};

} // namespace cms::api

#endif // CMS_API_MIDDLEWARE_HPP
```