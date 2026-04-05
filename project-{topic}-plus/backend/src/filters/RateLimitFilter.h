```cpp
#ifndef RATE_LIMIT_FILTER_H
#define RATE_LIMIT_FILTER_H

#include <drogon/drogon.h>
#include <chrono>
#include <mutex>
#include <unordered_map>
#include <thread> // For std::this_thread::sleep_for
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief A simple in-memory rate limiting implementation.
 *
 * This filter limits the number of requests from a client (identified by IP address)
 * within a certain time window. For multi-instance deployments, a distributed cache
 * like Redis would be required.
 */
class RateLimitFilter : public drogon::HttpFilter<RateLimitFilter> {
public:
    RateLimitFilter()
        : _maxRequests(50),      // Max 50 requests
          _windowSeconds(60),   // per 60 seconds
          _cleanupIntervalSeconds(300) // Cleanup old entries every 5 minutes
    {
        // Start a cleanup thread
        _cleanupThread = std::thread([this]() {
            this->cleanupLoop();
        });
        _cleanupThread.detach(); // Detach to run independently
    }

    ~RateLimitFilter() {
        _running = false;
        if (_cleanupThread.joinable()) {
            _cleanupThread.join(); // This might not be called if detached and app exits quickly
        }
    }

    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc_callback,
                          drogon::FilterChainCallback&& fcc_callback) override {
        std::string clientIdentifier = req->getPeerAddr().toIpString(); // Use IP address

        std::lock_guard<std::mutex> lock(_mutex);

        auto now = std::chrono::steady_clock::now();
        auto& requestTimestamps = _clientRequests[clientIdentifier];

        // Remove timestamps older than the window
        requestTimestamps.erase(
            std::remove_if(requestTimestamps.begin(), requestTimestamps.end(),
                           [&](const std::chrono::steady_clock::time_point& ts) {
                               return now - ts > std::chrono::seconds(_windowSeconds);
                           }),
            requestTimestamps.end()
        );

        if (requestTimestamps.size() >= _maxRequests) {
            // Rate limit exceeded
            auto resp = drogon::HttpResponse::newHttp429Response();
            resp->setBody(Json::Value(TooManyRequestsException().what()).toStyledString());
            resp->addHeader("Retry-After", std::to_string(_windowSeconds)); // Suggest when to retry
            fc_callback(resp);
            LOG_WARN << "Rate limit exceeded for IP: " << clientIdentifier;
            return;
        }

        // Add current request timestamp
        requestTimestamps.push_back(now);

        // Proceed
        fcc_callback();
    }

private:
    unsigned int _maxRequests;
    unsigned int _windowSeconds;
    unsigned int _cleanupIntervalSeconds; // How often to clean up stale entries

    std::unordered_map<std::string, std::vector<std::chrono::steady_clock::time_point>> _clientRequests;
    std::mutex _mutex;
    std::atomic<bool> _running{true};
    std::thread _cleanupThread;

    void cleanupLoop() {
        while (_running) {
            std::this_thread::sleep_for(std::chrono::seconds(_cleanupIntervalSeconds));
            if (!_running) break;

            std::lock_guard<std::mutex> lock(_mutex);
            auto now = std::chrono::steady_clock::now();

            for (auto it = _clientRequests.begin(); it != _clientRequests.end(); ) {
                it->second.erase(
                    std::remove_if(it->second.begin(), it->second.end(),
                                   [&](const std::chrono::steady_clock::time_point& ts) {
                                       return now - ts > std::chrono::seconds(_windowSeconds);
                                   }),
                    it->second.end()
                );

                if (it->second.empty()) {
                    it = _clientRequests.erase(it); // Remove client if no active requests
                } else {
                    ++it;
                }
            }
            LOG_DEBUG << "Rate limit map cleanup completed.";
        }
    }
};

} // namespace TaskManager

#endif // RATE_LIMIT_FILTER_H
```