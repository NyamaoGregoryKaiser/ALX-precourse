```cpp
#include "CachingManager.hpp"

CachingManager::CachingManager() {
    Logger::log(LogLevel::INFO, "CachingManager initialized.");
}

void CachingManager::set(const std::string& key, const std::string& value, long ttl_seconds) {
    std::lock_guard<std::mutex> lock(cache_mutex_);
    auto expiry_time = std::chrono::steady_clock::now() + std::chrono::seconds(ttl_seconds);
    cache_[key] = {value, expiry_time};
    Logger::log(LogLevel::DEBUG, "Cache set: key '" + key + "' with TTL " + std::to_string(ttl_seconds) + "s.");
}

std::optional<std::string> CachingManager::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(cache_mutex_);
    auto it = cache_.find(key);
    if (it != cache_.end()) {
        if (!isExpired(it->second)) {
            Logger::log(LogLevel::DEBUG, "Cache hit for key '" + key + "'.");
            return it->second.value;
        } else {
            // Item expired, remove it
            Logger::log(LogLevel::DEBUG, "Cache miss (expired) for key '" + key + "'. Removing.");
            cache_.erase(it);
        }
    }
    Logger::log(LogLevel::DEBUG, "Cache miss for key '" + key + "'.");
    return std::nullopt;
}

void CachingManager::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(cache_mutex_);
    if (cache_.erase(key)) {
        Logger::log(LogLevel::DEBUG, "Cache removed: key '" + key + "'.");
    } else {
        Logger::log(LogLevel::DEBUG, "Cache remove failed: key '" + key + "' not found.");
    }
}

void CachingManager::clear() {
    std::lock_guard<std::mutex> lock(cache_mutex_);
    cache_.clear();
    Logger::log(LogLevel::INFO, "Cache cleared.");
}

size_t CachingManager::size() {
    std::lock_guard<std::mutex> lock(cache_mutex_);
    // To get the actual size, we should prune expired items first
    // This is a simple implementation; a real cache might have a background cleanup thread
    size_t count = 0;
    for (auto it = cache_.begin(); it != cache_.end(); ) {
        if (isExpired(it->second)) {
            it = cache_.erase(it);
        } else {
            count++;
            ++it;
        }
    }
    return count;
}

bool CachingManager::isExpired(const CachedItem& item) const {
    return std::chrono::steady_clock::now() > item.expiry_time;
}
```