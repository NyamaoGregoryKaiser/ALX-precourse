```cpp
#include "Cache.h"
#include <drogon/drogon.h>

namespace CMS::Utils {

std::unordered_map<std::string, Cache::CacheEntry> Cache::cacheMap_;
std::mutex Cache::mutex_;
size_t Cache::defaultExpirySeconds_ = 600; // Default to 10 minutes

void Cache::init(size_t expirySeconds) {
    defaultExpirySeconds_ = expirySeconds;
    LOG_INFO << "Cache initialized with " << expirySeconds << " seconds expiry.";
}

bool Cache::get(const std::string& key, drogon::HttpResponsePtr& outResp) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = cacheMap_.find(key);
    if (it != cacheMap_.end()) {
        if (std::chrono::steady_clock::now() < it->second.expiryTime) {
            outResp = it->second.response;
            return true;
        } else {
            // Expired entry
            cacheMap_.erase(it);
        }
    }
    return false;
}

void Cache::set(const std::string& key, const drogon::HttpResponsePtr& resp) {
    std::lock_guard<std::mutex> lock(mutex_);
    cacheMap_[key] = {resp, std::chrono::steady_clock::now() + std::chrono::seconds(defaultExpirySeconds_)};
    LOG_DEBUG << "Cached item with key: " << key;
}

void Cache::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);
    cacheMap_.erase(key);
    LOG_DEBUG << "Removed item from cache: " << key;
}

void Cache::clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    cacheMap_.clear();
    LOG_INFO << "Cache cleared.";
}

} // namespace CMS::Utils
```