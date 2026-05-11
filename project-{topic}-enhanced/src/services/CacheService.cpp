#include "CacheService.h"
#include "../utils/Logger.h"

CacheService::CacheService() {
    // Optionally start a background thread for periodic cleanup
    LOG_INFO("CacheService initialized.");
}

void CacheService::set(const std::string& key, const json& value, std::chrono::seconds ttl) {
    std::lock_guard<std::mutex> lock(mutex_);
    cache_[key] = {value, std::chrono::system_clock::now() + ttl};
    LOG_DEBUG("Cache set for key: {} (expires in {}s)", key, ttl.count());
}

json CacheService::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = cache_.find(key);
    if (it != cache_.end()) {
        if (std::chrono::system_clock::now() < it->second.expiry_time) {
            LOG_DEBUG("Cache hit for key: {}", key);
            return it->second.value;
        } else {
            LOG_DEBUG("Cache entry expired for key: {}", key);
            cache_.erase(it); // Remove expired entry
        }
    }
    LOG_DEBUG("Cache miss for key: {}", key);
    return json(); // Return null json object
}

bool CacheService::has(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = cache_.find(key);
    if (it != cache_.end()) {
        if (std::chrono::system_clock::now() < it->second.expiry_time) {
            return true;
        } else {
            cache_.erase(it);
        }
    }
    return false;
}

void CacheService::invalidate(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (cache_.count(key)) {
        cache_.erase(key);
        LOG_INFO("Cache invalidated for key: {}", key);
    }
}

void CacheService::clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    cache_.clear();
    LOG_INFO("Cache cleared.");
}

void CacheService::cleanupExpiredEntries() {
    // This would typically run in a separate thread.
    // For simplicity, it's not actively threaded here.
    // Call it manually or on a timer in a real setup.
    std::lock_guard<std::mutex> lock(mutex_);
    auto now = std::chrono::system_clock::now();
    for (auto it = cache_.begin(); it != cache_.end(); ) {
        if (now >= it->second.expiry_time) {
            it = cache_.erase(it);
        } else {
            ++it;
        }
    }
    LOG_DEBUG("Cache cleanup completed.");
}
```