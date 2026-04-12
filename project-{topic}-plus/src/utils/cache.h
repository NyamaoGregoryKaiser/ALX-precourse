#pragma once

#include <string>
#include <unordered_map>
#include <mutex>
#include <chrono>
#include <optional>

namespace Utils {

template<typename T>
struct CacheEntry {
    T value;
    std::chrono::steady_clock::time_point expiry_time;
};

// A simple in-memory key-value cache with expiration.
// Not optimized for high concurrency or complex eviction policies,
// but sufficient for common use cases like storing user roles or configuration.
template<typename T>
class Cache {
public:
    Cache() = default;
    ~Cache() = default;

    // Delete copy constructor and assignment operator
    Cache(const Cache&) = delete;
    Cache& operator=(const Cache&) = delete;

    // Add an item to the cache with a specified time-to-live (TTL) in seconds.
    void set(const std::string& key, const T& value, long ttl_seconds) {
        std::lock_guard<std::mutex> lock(mutex_);
        cache_[key] = {
            value,
            std::chrono::steady_clock::now() + std::chrono::seconds(ttl_seconds)
        };
    }

    // Retrieve an item from the cache. Returns std::nullopt if not found or expired.
    std::optional<T> get(const std::string& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = cache_.find(key);
        if (it != cache_.end()) {
            if (it->second.expiry_time > std::chrono::steady_clock::now()) {
                return it->second.value;
            } else {
                // Expired, remove it
                cache_.erase(it);
            }
        }
        return std::nullopt;
    }

    // Remove an item from the cache.
    void remove(const std::string& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        cache_.erase(key);
    }

    // Clear all items from the cache.
    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        cache_.clear();
    }

    // Get the current size of the cache (excluding expired items if a cleanup were run)
    size_t size() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return cache_.size();
    }

private:
    std::unordered_map<std::string, CacheEntry<T>> cache_;
    mutable std::mutex mutex_; // mutable for const methods that need to lock
};

} // namespace Utils
```