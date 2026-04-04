#pragma once

#include <string>
#include <chrono>
#include <unordered_map>
#include <mutex>

namespace tm_api {
namespace utils {

struct RateLimitEntry {
    int count;
    std::chrono::steady_clock::time_point windowStart;
};

class RateLimiter {
public:
    static void init(bool enabled = false, int maxRequests = 100, int windowSeconds = 60);
    static bool allowRequest(const std::string& ipAddress);
    static void clear(); // For testing or administrative purposes

private:
    RateLimiter() = delete;

    static bool enabled;
    static int maxRequests;
    static std::chrono::seconds windowDuration;
    static std::unordered_map<std::string, RateLimitEntry> ipRequestCounts;
    static std::mutex limiterMutex;
};

} // namespace utils
} // namespace tm_api