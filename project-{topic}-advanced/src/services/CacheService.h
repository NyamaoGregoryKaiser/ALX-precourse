#ifndef CACHE_SERVICE_H
#define CACHE_SERVICE_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <json/json.h>
#include <optional>

namespace CacheService {

    // Cache entry structure
    struct CacheEntry {
        Json::Value data;
        std::chrono::steady_clock::time_point expirationTime;
    };

    // Global cache map
    extern std::unordered_map<std::string, CacheEntry> cache_;
    extern std::mutex cacheMutex_;
    extern int defaultTtlSeconds_;

    /**
     * @brief Initializes the cache service with a default TTL.
     * @param ttlSeconds Default time-to-live for cache entries in seconds.
     */
    void init(int ttlSeconds);

    /**
     * @brief Puts data into the cache with a specified key and optional TTL.
     * @param key The cache key.
     * @param data The JSON data to cache.
     * @param ttlSeconds Optional time-to-live for this specific entry. Uses default if 0.
     */
    void put(const std::string& key, const Json::Value& data, int ttlSeconds = 0);

    /**
     * @brief Retrieves data from the cache.
     * @param key The cache key.
     * @return Optional JSON value if found and not expired, std::nullopt otherwise.
     */
    std::optional<Json::Value> get(const std::string& key);

    /**
     * @brief Removes an entry from the cache.
     * @param key The cache key.
     */
    void remove(const std::string& key);

    /**
     * @brief Clears the entire cache.
     */
    void clear();

    /**
     * @brief Cleans up expired entries from the cache.
     *        This can be called periodically or before a 'get' operation.
     */
    void cleanup();

} // namespace CacheService

#endif // CACHE_SERVICE_H
```