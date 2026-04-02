```cpp
#ifndef CACHE_H
#define CACHE_H

#include <string>
#include <map>
#include <chrono>
#include <mutex>
#include <optional>
#include <json/json.hpp>
#include "../utils/Logger.h"

namespace TaskManager {
namespace Cache {

struct CacheEntry {
    nlohmann::json data;
    std::chrono::steady_clock::time_point expiration_time;
};

// Simple in-memory cache for JSON objects
class Cache {
public:
    static Cache& getInstance();

    // Prevent copying
    Cache(const Cache&) = delete;
    Cache& operator=(const Cache&) = delete;

    // Initialize cache with TTL
    void init(long long default_ttl_seconds);

    // Set an item in the cache
    void set(const std::string& key, const nlohmann::json& value);

    // Get an item from the cache
    std::optional<nlohmann::json> get(const std::string& key);

    // Remove an item from the cache
    void remove(const std::string& key);

    // Clear the entire cache
    void clear();

    // Get number of items in cache
    size_t size() const;

private:
    Cache();
    ~Cache() = default;

    std::map<std::string, CacheEntry> cache_map;
    mutable std::mutex cache_mutex; // Mutex for thread-safe access
    long long default_ttl; // Time-to-live in seconds
};

} // namespace Cache
} // namespace TaskManager

#endif // CACHE_H
```