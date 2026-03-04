```cpp
#ifndef VISGENIUS_RATE_LIMITING_H
#define VISGENIUS_RATE_LIMITING_H

#include <string>
#include <map>
#include <chrono>
#include <mutex>

#include "Logger.h"

namespace VisGenius {

class RateLimiter {
public:
    RateLimiter(int max_requests_per_window = 100, std::chrono::seconds window_duration = std::chrono::minutes(1));

    bool isRateLimited(const std::string& client_identifier);
    void cleanupExpired(); // Periodically clean up old entries

private:
    struct ClientState {
        int request_count;
        std::chrono::steady_clock::time_point window_start;
    };

    std::map<std::string, ClientState> m_clientStates;
    std::mutex m_mutex;

    int m_maxRequests;
    std::chrono::seconds m_windowDuration;
};

} // namespace VisGenius

#endif // VISGENIUS_RATE_LIMITING_H
```