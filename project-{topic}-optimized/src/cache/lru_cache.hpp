#ifndef CMS_LRU_CACHE_HPP
#define CMS_LRU_CACHE_HPP

#include <list>
#include <unordered_map>
#include <mutex>
#include <optional>
#include <string> // For logging
#include "../common/logger.hpp" // For logging

namespace cms::cache {

template<typename Key, typename Value>
class LRUCache {
public:
    explicit LRUCache(size_t capacity) : capacity_(capacity) {
        if (capacity_ == 0) {
            LOG_WARN("LRUCache created with capacity 0. No items will be cached.");
        } else {
            LOG_INFO("LRUCache initialized with capacity: {}", capacity_);
        }
    }

    std::optional<Value> get(const Key& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = cache_map_.find(key);
        if (it == cache_map_.end()) {
            return std::nullopt; // Key not found
        }

        // Move the accessed item to the front (most recently used)
        cache_list_.splice(cache_list_.begin(), cache_list_, it->second.second);
        return it->second.first;
    }

    void put(const Key& key, const Value& value) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (capacity_ == 0) {
            LOG_DEBUG("LRUCache has 0 capacity, not caching key: {}", key);
            return; // Don't cache if capacity is 0
        }

        auto it = cache_map_.find(key);
        if (it != cache_map_.end()) {
            // Item already exists, update its value and move to front
            it->second.first = value;
            cache_list_.splice(cache_list_.begin(), cache_list_, it->second.second);
        } else {
            // New item, check capacity
            if (cache_map_.size() >= capacity_) {
                // Evict the least recently used item (back of the list)
                const Key& lru_key = cache_list_.back();
                LOG_DEBUG("LRUCache evicting key: {}", lru_key);
                cache_map_.erase(lru_key);
                cache_list_.pop_back();
            }
            // Add new item to front of list and map
            cache_list_.push_front(key);
            cache_map_[key] = {value, cache_list_.begin()};
            LOG_DEBUG("LRUCache added key: {}", key);
        }
    }

    void remove(const Key& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = cache_map_.find(key);
        if (it != cache_map_.end()) {
            cache_list_.erase(it->second.second);
            cache_map_.erase(it);
            LOG_DEBUG("LRUCache removed key: {}", key);
        }
    }

    size_t size() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return cache_map_.size();
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        cache_map_.clear();
        cache_list_.clear();
        LOG_INFO("LRUCache cleared.");
    }

private:
    using ListIterator = typename std::list<Key>::iterator;
    size_t capacity_;
    std::list<Key> cache_list_; // Stores keys in LRU order (front is most recent)
    std::unordered_map<Key, std::pair<Value, ListIterator>> cache_map_; // Maps key to {value, list_iterator}
    mutable std::mutex mutex_; // Protects access to cache_list_ and cache_map_
};

} // namespace cms::cache

#endif // CMS_LRU_CACHE_HPP
```