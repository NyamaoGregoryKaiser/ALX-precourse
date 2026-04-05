```cpp
#include "CacheService.hpp"
#include "../logger/Logger.hpp"

#include <chrono>
#include <mutex>

CacheService::CacheService(int defaultTtlSeconds)
    : defaultTtlSeconds(defaultTtlSeconds) {
    Logger::info("CacheService: Initialized with default TTL {} seconds.", defaultTtlSeconds);
}

// Adds an item to the cache.
void CacheService::put(const std::string& key, const std::string& value, int ttlSeconds) {
    std::lock_guard<std::mutex> lock(mtx);
    auto expiryTime = std::chrono::steady_clock::now() + std::chrono::seconds(ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds);
    cache[key] = {value, expiryTime};
    Logger::debug("CacheService: Added item for key '{}' with TTL {}s.", key, ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds);
}

// Retrieves an item from the cache. Returns std::nullopt if not found or expired.
std::optional<std::string> CacheService::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(mtx);
    auto it = cache.find(key);
    if (it != cache.end()) {
        if (it->second.expiryTime > std::chrono::steady_clock::now()) {
            Logger::debug("CacheService: Retrieved item for key '{}' from cache.", key);
            return it->second.value;
        } else {
            // Expired, remove it
            cache.erase(it);
            Logger::debug("CacheService: Item for key '{}' expired and removed from cache.", key);
        }
    }
    Logger::debug("CacheService: Item for key '{}' not found or expired in cache.", key);
    return std::nullopt;
}

// Removes an item from the cache.
void CacheService::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(mtx);
    if (cache.erase(key) > 0) {
        Logger::debug("CacheService: Removed item for key '{}' from cache.", key);
    }
}

// Clears all items from the cache.
void CacheService::clear() {
    std::lock_guard<std::mutex> lock(mtx);
    cache.clear();
    Logger::info("CacheService: Cache cleared.");
}

// Cleans up expired items (can be called periodically or on certain events).
void CacheService::cleanup() {
    std::lock_guard<std::mutex> lock(mtx);
    auto now = std::chrono::steady_clock::now();
    for (auto it = cache.begin(); it != cache.end(); ) {
        if (it->second.expiryTime <= now) {
            it = cache.erase(it);
            Logger::debug("CacheService: Cleaned up expired item for key '{}'.", it->first);
        } else {
            ++it;
        }
    }
}
```