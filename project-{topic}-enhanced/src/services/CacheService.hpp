```cpp
#ifndef CACHE_SERVICE_HPP
#define CACHE_SERVICE_HPP

#include <string>
#include <map>
#include <chrono>
#include <mutex>
#include <optional>

// CacheService implements a simple in-memory cache with Time-To-Live (TTL).
// It is thread-safe using a mutex.
class CacheService {
public:
    // Constructor.
    // @param defaultTtlSeconds The default time-to-live for cache entries if not specified per-item.
    explicit CacheService(int defaultTtlSeconds);

    // Adds an item to the cache.
    // @param key The unique key for the item.
    // @param value The string value to cache.
    // @param ttlSeconds Optional, specific TTL for this item. If 0 or less, uses defaultTtlSeconds.
    void put(const std::string& key, const std::string& value, int ttlSeconds = 0);

    // Retrieves an item from the cache.
    // @param key The key of the item to retrieve.
    // @return std::optional<std::string> The cached value if found and not expired, std::nullopt otherwise.
    std::optional<std::string> get(const std::string& key);

    // Removes an item from the cache.
    // @param key The key of the item to remove.
    void remove(const std::string& key);

    // Clears all items from the cache.
    void clear();

    // Cleans up expired items from the cache.
    void cleanup(); // Can be called periodically

private:
    struct CacheEntry {
        std::string value;
        std::chrono::steady_clock::time_point expiryTime;
    };

    std::map<std::string, CacheEntry> cache; // The underlying map for cache storage
    std::mutex mtx; // Mutex for thread-safe access
    int defaultTtlSeconds; // Default TTL for cache entries
};

#endif // CACHE_SERVICE_HPP
```