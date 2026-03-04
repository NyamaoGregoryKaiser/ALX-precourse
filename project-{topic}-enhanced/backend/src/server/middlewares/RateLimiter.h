#pragma once

#include "Middleware.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp"
#include <chrono>
#include <map>
#include <mutex>

struct RateLimitState {
    int count = 0;
    std::chrono::steady_clock::time_point window_start;
};

class RateLimiter : public Middleware {
public:
    RateLimiter(int max_requests_per_window, std::chrono::seconds window_duration);

    HttpResponse handle(HttpRequest& request) override;

private:
    int max_requests_per_window_;
    std::chrono::seconds window_duration_;
    std::map<std::string, RateLimitState> client_states_; // Keyed by IP address
    std::mutex mutex_;

    std::string getClientIp(const HttpRequest& request);
};