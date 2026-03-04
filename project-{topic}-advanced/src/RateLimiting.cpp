```cpp
#include "RateLimiting.h"

namespace VisGenius {

RateLimiter::RateLimiter(int max_requests_per_window, std::chrono::seconds window_duration)
    : m_maxRequests(max_requests_per_window), m_windowDuration(window_duration) {
    LOG_INFO("RateLimiter initialized: Max {} requests per {} seconds.", m_maxRequests, m_windowDuration.count());
}

bool RateLimiter::isRateLimited(const std::string& client_identifier) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto now = std::chrono::steady_clock::now();

    ClientState& state = m_clientStates[client_identifier]; // Creates if not exists

    if (state.window_start == std::chrono::steady_clock::time_point()) { // First request for this client
        state.window_start = now;
        state.request_count = 1;
        LOG_DEBUG("RateLimiter: Client '{}' first request. Count: 1.", client_identifier);
        return false;
    }

    if (now - state.window_start > m_windowDuration) {
        // Window expired, reset
        state.window_start = now;
        state.request_count = 1;
        LOG_DEBUG("RateLimiter: Client '{}' window reset. Count: 1.", client_identifier);
        return false;
    } else {
        // Within current window
        state.request_count++;
        if (state.request_count > m_maxRequests) {
            LOG_WARN("RateLimiter: Client '{}' exceeded rate limit ({} requests in {}s).", client_identifier, state.request_count, std::chrono::duration_cast<std::chrono::seconds>(now - state.window_start).count());
            return true; // Rate limited
        }
        LOG_DEBUG("RateLimiter: Client '{}' request. Count: {}.", client_identifier, state.request_count);
        return false; // Not rate limited
    }
}

void RateLimiter::cleanupExpired() {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto now = std::chrono::steady_clock::now();
    size_t removed_count = 0;
    for (auto it = m_clientStates.begin(); it != m_clientStates.end(); ) {
        if (now - it->second.window_start > m_windowDuration * 2) { // Remove entries significantly older than a window
            it = m_clientStates.erase(it);
            removed_count++;
        } else {
            ++it;
        }
    }
    if (removed_count > 0) {
        LOG_INFO("RateLimiter: Cleaned up {} expired client states.", removed_count);
    }
}

} // namespace VisGenius
```