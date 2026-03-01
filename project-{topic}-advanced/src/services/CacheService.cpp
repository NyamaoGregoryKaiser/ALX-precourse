#include "CacheService.h"
#include <drogon/drogon.h> // For LOG_DEBUG

namespace CacheService {

    std::unordered_map<std::string, CacheEntry> cache_;
    std::mutex cacheMutex_;
    int defaultTtlSeconds_ = 300; // Default to 5 minutes

    void init(int ttlSeconds) {
        if (ttlSeconds > 0) {
            defaultTtlSeconds_ = ttlSeconds;
        }
        LOG_DEBUG << "CacheService initialized with default TTL: " << defaultTtlSeconds_ << " seconds.";
    }

    void put(const std::string& key, const Json::Value& data, int ttlSeconds) {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        int effectiveTtl = (ttlSeconds > 0) ? ttlSeconds : defaultTtlSeconds_;
        cache_[key] = {data, std::chrono::steady_clock::now() + std::chrono::seconds(effectiveTtl)};
        LOG_DEBUG << "Cached key: " << key << " with TTL: " << effectiveTtl << "s.";
    }

    std::optional<Json::Value> get(const std::string& key) {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        auto it = cache_.find(key);
        if (it != cache_.end()) {
            if (it->second.expirationTime > std::chrono::steady_clock::now()) {
                LOG_DEBUG << "Cache hit for key: " << key;
                return it->second.data;
            } else {
                LOG_DEBUG << "Cache entry expired for key: " << key;
                cache_.erase(it); // Remove expired entry
            }
        }
        LOG_DEBUG << "Cache miss for key: " << key;
        return std::nullopt;
    }

    void remove(const std::string& key) {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        if (cache_.count(key)) {
            cache_.erase(key);
            LOG_DEBUG << "Removed key from cache: " << key;
        }
    }

    void clear() {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        cache_.clear();
        LOG_DEBUG << "Cache cleared.";
    }

    void cleanup() {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        auto now = std::chrono::steady_clock::now();
        for (auto it = cache_.begin(); it != cache_.end(); ) {
            if (it->second.expirationTime <= now) {
                LOG_DEBUG << "Cleaning up expired cache entry: " << it->first;
                it = cache_.erase(it);
            } else {
                ++it;
            }
        }
    }

} // namespace CacheService
```