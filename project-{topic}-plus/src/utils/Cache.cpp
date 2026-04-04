#include "Cache.h"
#include "Logger.h"

namespace tm_api {
namespace utils {

template<typename Key, typename Value>
LRUCache<Key, Value>::LRUCache(size_t capacity, std::chrono::seconds defaultExpiry)
    : capacity(capacity), defaultExpiry(defaultExpiry) {
    if (capacity == 0) {
        LOG_WARN("LRUCache created with capacity 0. No items will be cached.");
    }
    LOG_INFO("LRUCache initialized with capacity {} and default expiry {}s.", capacity, defaultExpiry.count());
}

template<typename Key, typename Value>
void LRUCache<Key, Value>::put(const Key& key, const Value& value) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    if (capacity == 0) {
        return; // Cache is disabled
    }

    auto it = cacheMap.find(key);
    if (it != cacheMap.end()) {
        // Key exists, update value and move to front
        lruList.erase(it->second.second);
        cacheMap.erase(it);
    } else if (cacheMap.size() >= capacity) {
        // Cache is full, evict LRU item
        evict();
    }

    // Add new item to front of list and map
    lruList.push_front(key);
    cacheMap[key] = {value, std::chrono::steady_clock::now() + defaultExpiry, lruList.begin()};
    LOG_DEBUG("Cache: Put key '{}'. Current size: {}.", key, cacheMap.size());
}

template<typename Key, typename Value>
std::optional<Value> LRUCache<Key, Value>::get(const Key& key) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    auto it = cacheMap.find(key);
    if (it == cacheMap.end()) {
        LOG_DEBUG("Cache: Key '{}' not found.", key);
        return std::nullopt; // Key not found
    }

    if (isExpired(it->second)) {
        LOG_DEBUG("Cache: Key '{}' found but expired. Removing.", key);
        remove(key); // Remove expired item
        return std::nullopt;
    }

    // Move item to front of LRU list (most recently used)
    lruList.erase(it->second.second);
    lruList.push_front(key);
    it->second.second = lruList.begin(); // Update iterator in map

    LOG_DEBUG("Cache: Get key '{}'.", key);
    return it->second.first;
}

template<typename Key, typename Value>
void LRUCache<Key, Value>::remove(const Key& key) {
    std::lock_guard<std::mutex> lock(cacheMutex);

    auto it = cacheMap.find(key);
    if (it != cacheMap.end()) {
        lruList.erase(it->second.second);
        cacheMap.erase(it);
        LOG_DEBUG("Cache: Removed key '{}'. Current size: {}.", key, cacheMap.size());
    }
}

template<typename Key, typename Value>
void LRUCache<Key, Value>::clear() {
    std::lock_guard<std::mutex> lock(cacheMutex);
    lruList.clear();
    cacheMap.clear();
    LOG_INFO("Cache: Cleared all items. Size: {}.", cacheMap.size());
}

template<typename Key, typename Value>
size_t LRUCache<Key, Value>::size() const {
    std::lock_guard<std::mutex> lock(cacheMutex);
    return cacheMap.size();
}

template<typename Key, typename Value>
void LRUCache<Key, Value>::evict() {
    if (lruList.empty()) return;

    Key lruKey = lruList.back();
    lruList.pop_back();
    cacheMap.erase(lruKey);
    LOG_DEBUG("Cache: Evicted LRU key '{}'.", lruKey);
}

template<typename Key, typename Value>
bool LRUCache<Key, Value>::isExpired(const CacheEntry<Key, Value>& entry) const {
    return std::chrono::steady_clock::now() > entry.expiry;
}

// Explicit instantiations for common types used in this project
// This is necessary if the template is defined in a .cpp file.
template class LRUCache<std::string, std::string>;
// For caching Json::Value if needed:
// template class LRUCache<std::string, Json::Value>;

} // namespace utils
} // namespace tm_api