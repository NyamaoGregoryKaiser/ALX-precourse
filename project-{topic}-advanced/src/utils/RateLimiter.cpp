```cpp
#include "RateLimiter.hpp"
#include <algorithm> // For std::remove_if

RateLimiter::RateLimiter(int window_seconds, int max_requests)
    : window_seconds_(window_seconds), max_requests_(max_requests) {
    if (window_seconds_ <= 0 || max_requests_ <= 0) {
        Logger::log(LogLevel::CRITICAL, "RateLimiter initialized with invalid window/max_requests values.");
        throw std::invalid_argument("RateLimiter window_seconds and max_requests must be positive.");
    }
    Logger::log(LogLevel::INFO, "RateLimiter initialized: " + std::to_string(max_requests_) + " requests per " + std::to_string(window_seconds_) + " seconds.");
}

bool RateLimiter::allowRequest(const std::string& client_id) {
    std::lock_guard<std::mutex> lock(limiter_mutex_);
    auto now = std::chrono::steady_clock::now();

    ClientRequestData& data = client_data_[client_id]; // Creates new entry if client_id doesn't exist

    if (data.request_count == 0 || (now - data.window_start) > std::chrono::seconds(window_seconds_)) {
        // If the window has expired or this is the first request in a new window
        data.request_count = 1;
        data.window_start = now;
        Logger::log(LogLevel::DEBUG, "RateLimiter: Client '" + client_id + "' new window. Request allowed.");
        return true;
    } else if (data.request_count < max_requests_) {
        // Within window and below limit
        data.request_count++;
        Logger::log(LogLevel::DEBUG, "RateLimiter: Client '" + client_id + "' request " + std::to_string(data.request_count) + "/" + std::to_string(max_requests_) + " allowed.");
        return true;
    } else {
        // Within window but exceeded limit
        Logger::log(LogLevel::WARNING, "RateLimiter: Client '" + client_id + "' exceeded limit of " + std::to_string(max_requests_) + " requests in " + std::to_string(window_seconds_) + "s.");
        return false;
    }
}

void RateLimiter::clear() {
    std::lock_guard<std::mutex> lock(limiter_mutex_);
    client_data_.clear();
    Logger::log(LogLevel::INFO, "RateLimiter data cleared.");
}

// Cleanup function - can be called periodically by a separate thread or implicitly
// on access if performance is not critical. For high-performance, a dedicated thread is better.
void RateLimiter::cleanupExpiredEntries() {
    std::lock_guard<std::mutex> lock(limiter_mutex_);
    auto now = std::chrono::steady_clock::now();
    for (auto it = client_data_.begin(); it != client_data_.end(); ) {
        if ((now - it->second.window_start) > std::chrono::seconds(window_seconds_ * 2)) { // Purge older than 2 windows
            it = client_data_.erase(it);
        } else {
            ++it;
        }
    }
}
```