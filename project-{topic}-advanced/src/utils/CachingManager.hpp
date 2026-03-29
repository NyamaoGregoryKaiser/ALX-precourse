```cpp
#ifndef CACHING_MANAGER_HPP
#define CACHING_MANAGER_HPP

#include <string>
#include <unordered_map>
#include <mutex>
#include <chrono>
#include <optional>
#include "Logger.hpp"

// Represents a cached item with its value and expiry time
struct CachedItem {
    std::string value;
    std::chrono::time_point<std::chrono::steady_clock> expiry_time;
};

class CachingManager {
public:
    CachingManager();
    
    // Add an item to the cache with a TTL (Time-To-Live) in seconds
    void set(const std::string& key, const std::string& value, long ttl_seconds);

    // Retrieve an item from the cache. Returns nullopt if not found or expired.
    std::optional<std::string> get(const std::string& key);

    // Remove an item from the cache
    void remove(const std::string& key);

    // Clear all items from the cache
    void clear();

    // Get current size of the cache (number of valid items)
    size_t size();

private:
    std::unordered_map<std::string, CachedItem> cache_;
    std::mutex cache_mutex_;

    // Check if an item is expired
    bool isExpired(const CachedItem& item) const;
};

#endif // CACHING_MANAGER_HPP
```