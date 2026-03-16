```cpp
#ifndef MOBILE_BACKEND_CACHE_H
#define MOBILE_BACKEND_CACHE_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <optional>
#include "logger.h"

namespace mobile_backend {
namespace utils {

template <typename T>
struct CacheEntry {
    T value;
    std::chrono::steady_clock::time_point expiry_time;
};

// Simple in-memory cache with Time-To-Live (TTL)
template <typename T>
class Cache {
public:
    Cache(std::chrono::seconds ttl) : default_ttl(ttl) {}

    // Add an item to the cache with the default TTL
    void put(const std::string& key, const T& value) {
        std::lock_guard<std::mutex> lock(cache_mutex);
        cache_[key] = {value, std::chrono::steady_clock::now() + default_ttl};
        LOG_DEBUG("Cache: Added/Updated key '{}'", key);
    }

    // Add an item to the cache with a specific TTL
    void put(const std::string& key, const T& value, std::chrono::seconds custom_ttl) {
        std::lock_guard<std::mutex> lock(cache_mutex);
        cache_[key] = {value, std::chrono::steady_clock::now() + custom_ttl};
        LOG_DEBUG("Cache: Added/Updated key '{}' with custom TTL", key);
    }

    // Get an item from the cache. Returns std::nullopt if not found or expired.
    std::optional<T> get(const std::string& key) {
        std::lock_guard<std::mutex> lock(cache_mutex);
        auto it = cache_.find(key);
        if (it != cache_.end()) {
            if (std::chrono::steady_clock::now() < it->second.expiry_time) {
                LOG_DEBUG("Cache: Hit for key '{}'", key);
                return it->second.value;
            } else {
                // Expired item, remove it
                LOG_DEBUG("Cache: Expired item for key '{}', removing.", key);
                cache_.erase(it);
            }
        }
        LOG_DEBUG("Cache: Miss for key '{}'", key);
        return std::nullopt;
    }

    // Remove an item from the cache
    void remove(const std::string& key) {
        std::lock_guard<std::mutex> lock(cache_mutex);
        if (cache_.erase(key) > 0) {
            LOG_DEBUG("Cache: Removed key '{}'", key);
        } else {
            LOG_DEBUG("Cache: Key '{}' not found for removal.", key);
        }
    }

    // Clear all items from the cache
    void clear() {
        std::lock_guard<std::mutex> lock(cache_mutex);
        cache_.clear();
        LOG_DEBUG("Cache: All items cleared.");
    }

    // Get the current number of items in the cache
    size_t size() const {
        std::lock_guard<std::mutex> lock(cache_mutex);
        return cache_.size();
    }

private:
    std::unordered_map<std::string, CacheEntry<T>> cache_;
    std::chrono::seconds default_ttl;
    mutable std::mutex cache_mutex; // Mutex to protect cache access
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_CACHE_H
```