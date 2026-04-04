#pragma once

#include <list>
#include <unordered_map>
#include <string>
#include <chrono>
#include <optional>
#include <mutex>

namespace tm_api {
namespace utils {

template<typename Key, typename Value>
struct CacheEntry {
    Value value;
    std::chrono::steady_clock::time_point expiry;
};

template<typename Key, typename Value>
class LRUCache {
public:
    explicit LRUCache(size_t capacity, std::chrono::seconds defaultExpiry = std::chrono::seconds(300));

    void put(const Key& key, const Value& value);
    std::optional<Value> get(const Key& key);
    void remove(const Key& key);
    void clear();
    size_t size() const;

private:
    size_t capacity;
    std::chrono::seconds defaultExpiry;

    std::list<Key> lruList; // Stores keys in LRU order
    std::unordered_map<Key, typename std::list<Key>::iterator> keyToIterator; // Maps key to iterator in lruList
    std::unordered_map<Key, CacheEntry<Key, Value>> cacheMap; // Stores actual data

    mutable std::mutex cacheMutex; // For thread-safety

    void evict();
    bool isExpired(const CacheEntry<Key, Value>& entry) const;
};

// Explicit instantiation for common types might be needed if not fully header-only
// template class LRUCache<std::string, std::string>;
// template class LRUCache<std::string, Json::Value>;

} // namespace utils
} // namespace tm_api