```cpp
#ifndef RATELIMITER_H
#define RATELIMITER_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <deque> // For sliding window

#include "../utils/Logger.h"

// Represents a single client's request history
struct ClientRequestHistory {
    std::deque<std::chrono::steady_clock::time_point> timestamps;
    std::mutex mtx; // Mutex for this specific client's history
};

class RateLimiter {
public:
    static void init(int max_requests, int window_seconds) {
        std::lock_guard<std::mutex> lock(global_mtx);
        RateLimiter::max_requests = max_requests;
        RateLimiter::window_seconds = window_seconds;
        LOG_INFO("RateLimiter initialized with {} requests per {} seconds.", max_requests, window_seconds);
    }

    // Checks if a client (identified by `key`, e.g., IP address) is rate-limited.
    // Returns true if limited, false otherwise.
    static bool is_rate_limited(const std::string& key) {
        // Use a lock-free or finer-grained approach for `client_histories` map access if performance is critical
        // For now, use a global lock for map access, then a per-client lock for history manipulation
        std::shared_ptr<ClientRequestHistory> history;
        {
            std::lock_guard<std::mutex> lock(global_mtx);
            // Lazy initialization of client history
            if (client_histories.find(key) == client_histories.end()) {
                client_histories[key] = std::make_shared<ClientRequestHistory>();
            }
            history = client_histories[key];
        }

        std::lock_guard<std::mutex> client_lock(history->mtx); // Lock specific client's history

        auto now = std::chrono::steady_clock::now();
        auto window_start = now - std::chrono::seconds(window_seconds);

        // Remove old timestamps from the deque (sliding window)
        while (!history->timestamps.empty() && history->timestamps.front() < window_start) {
            history->timestamps.pop_front();
        }

        if (history->timestamps.size() >= max_requests) {
            LOG_WARN("Rate limit exceeded for key: {}", key);
            return true; // Too many requests in the window
        }

        history->timestamps.push_back(now); // Record the current request
        LOG_DEBUG("Request from {} allowed. Current count: {}", key, history->timestamps.size());
        return false; // Request allowed
    }

    // Clear history for a specific key (e.g., after an IP ban)
    static void clear_history(const std::string& key) {
        std::lock_guard<std::mutex> lock(global_mtx);
        client_histories.erase(key);
        LOG_INFO("Rate limiter history cleared for key: {}", key);
    }

    // Clear all history (e.g., for testing or global reset)
    static void clear_all_history() {
        std::lock_guard<std::mutex> lock(global_mtx);
        client_histories.clear();
        LOG_INFO("All rate limiter history cleared.");
    }

private:
    static int max_requests;
    static int window_seconds;
    // Store history for each client (e.g., IP address). Using shared_ptr to manage memory
    // and allow per-client mutexes without copying history around.
    static std::unordered_map<std::string, std::shared_ptr<ClientRequestHistory>> client_histories;
    static std::mutex global_mtx; // Protects access to client_histories map

    RateLimiter() = delete; // Prevent instantiation
};

// Static member initialization
int RateLimiter::max_requests = 0;
int RateLimiter::window_seconds = 0;
std::unordered_map<std::string, std::shared_ptr<ClientRequestHistory>> RateLimiter::client_histories;
std::mutex RateLimiter::global_mtx;

#endif // RATELIMITER_H
```