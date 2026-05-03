```cpp
#ifndef MLTOOLKIT_CACHE_HPP
#define MLTOOLKIT_CACHE_HPP

#include <string>
#include <unordered_map>
#include <list>
#include <mutex>
#include <optional>
#include "../common/Logger.hpp"

namespace MLToolkit {
namespace Middleware {

template <typename Key, typename Value>
class LRUCache {
public:
    explicit LRUCache(size_t capacity) : capacity_(capacity) {
        LOG_INFO("LRU Cache initialized with capacity: {}", capacity_);
    }

    std::optional<Value> get(const Key& key) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = cache_map_.find(key);
        if (it == cache_map_.end()) {
            LOG_DEBUG("Cache miss for key: {}", key);
            return std::nullopt;
        }

        // Move the accessed item to the front (most recently used)
        cache_list_.splice(cache_list_.begin(), cache_list_, it->second.second);
        LOG_DEBUG("Cache hit for key: {}", key);
        return it->second.first;
    }

    void put(const Key& key, const Value& value) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = cache_map_.find(key);

        if (it != cache_map_.end()) {
            // Update existing item
            it->second.first = value;
            cache_list_.splice(cache_list_.begin(), cache_list_, it->second.second);
            LOG_DEBUG("Cache updated for key: {}", key);
            return;
        }

        // Add new item
        if (cache_map_.size() >= capacity_) {
            // Remove least recently used item
            Key lru_key = cache_list_.back();
            cache_map_.erase(lru_key);
            cache_list_.pop_back();
            LOG_DEBUG("Cache eviction: Removed LRU item with key: {}", lru_key);
        }

        cache_list_.push_front(key);
        cache_map_[key] = {value, cache_list_.begin()};
        LOG_DEBUG("Cache added item for key: {}", key);
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        cache_map_.clear();
        cache_list_.clear();
        LOG_INFO("LRU Cache cleared.");
    }

    size_t size() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return cache_map_.size();
    }

private:
    size_t capacity_;
    std::list<Key> cache_list_; // Stores keys in order of recent use (front is most recent)
    std::unordered_map<Key, std::pair<Value, typename std::list<Key>::iterator>> cache_map_;
    mutable std::mutex mutex_;
};

} // namespace Middleware
} // namespace MLToolkit

#endif // MLTOOLKIT_CACHE_HPP
```