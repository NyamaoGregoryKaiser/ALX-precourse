#pragma once

#include <string>
#include <map>
#include <chrono>
#include <mutex>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct CacheEntry {
    json value;
    std::chrono::system_clock::time_point expiry_time;
};

class CacheService {
public:
    CacheService();

    void set(const std::string& key, const json& value, std::chrono::seconds ttl);
    json get(const std::string& key);
    bool has(const std::string& key);
    void invalidate(const std::string& key);
    void clear();

private:
    std::map<std::string, CacheEntry> cache_;
    std::mutex mutex_;

    void cleanupExpiredEntries();
};
```