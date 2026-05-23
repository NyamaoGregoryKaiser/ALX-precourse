```cpp
#pragma once

#include <drogon/drogon.h>
#include <string>
#include <unordered_map>
#include <mutex>
#include <chrono>

namespace CMS::Utils {

// Simple in-memory cache for HTTP responses
class Cache {
public:
    static void init(size_t expirySeconds);
    static bool get(const std::string& key, drogon::HttpResponsePtr& outResp);
    static void set(const std::string& key, const drogon::HttpResponsePtr& resp);
    static void remove(const std::string& key);
    static void clear();

private:
    struct CacheEntry {
        drogon::HttpResponsePtr response;
        std::chrono::steady_clock::time_point expiryTime;
    };

    static std::unordered_map<std::string, CacheEntry> cacheMap_;
    static std::mutex mutex_;
    static size_t defaultExpirySeconds_; // Time-to-live for cache entries
};

} // namespace CMS::Utils
```