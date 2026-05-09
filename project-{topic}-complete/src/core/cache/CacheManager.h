```cpp
#ifndef VISUFLOW_CACHE_MANAGER_H
#define VISUFLOW_CACHE_MANAGER_H

#include "util/Logger.h"

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <optional>

namespace VisuFlow {
namespace Core {
namespace Cache {

/**
 * @brief Simple in-memory cache manager with a Time-To-Live (TTL) mechanism.
 *
 * This cache stores string keys mapped to string values, with an expiration time.
 * It's thread-safe for concurrent access.
 */
class CacheManager {
public:
    explicit CacheManager(long long defaultTtlSeconds = 300); // 5 minutes default

    /**
     * @brief Puts a key-value pair into the cache with an optional TTL.
     * If ttlSeconds is 0, it uses the default TTL.
     * @param key The cache key.
     * @param value The value to store.
     * @param ttlSeconds The time-to-live for this entry in seconds.
     */
    void put(const std::string& key, const std::string& value, long long ttlSeconds = 0);

    /**
     * @brief Retrieves a value from the cache.
     * @param key The cache key.
     * @return An optional string containing the value if found and not expired,
     *         otherwise an empty optional.
     */
    std::optional<std::string> get(const std::string& key);

    /**
     * @brief Removes an entry from the cache.
     * @param key The cache key to remove.
     */
    void remove(const std::string& key);

    /**
     * @brief Clears all entries from the cache.
     */
    void clear();

    /**
     * @brief Gets the current size of the cache (number of active entries).
     * @return The number of entries in the cache.
     */
    size_t size() const;

private:
    struct CacheEntry {
        std::string value;
        std::chrono::steady_clock::time_point expiryTime;
    };

    long long m_defaultTtlSeconds;
    std::unordered_map<std::string, CacheEntry> m_cache;
    mutable std::mutex m_mutex; // Mutex for thread-safe access to m_cache

    /**
     * @brief Checks if a cache entry is expired.
     * @param entry The cache entry to check.
     * @return true if expired, false otherwise.
     */
    bool isExpired(const CacheEntry& entry) const;

    /**
     * @brief Cleans up expired entries (not a full LRU, simple expiry check on access).
     * This is a simple cleanup; a real cache might have a background thread for this.
     */
    void cleanupExpiredEntries();
};

} // namespace Cache
} // namespace Core
} // namespace VisuFlow

#endif // VISUFLOW_CACHE_MANAGER_H
```