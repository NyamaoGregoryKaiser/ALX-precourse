```cpp
#ifndef WEBSCRAPER_LRU_CACHE_H
#define WEBSCRAPER_LRU_CACHE_H

#include <list>
#include <unordered_map>
#include <string>
#include <optional>
#include <mutex>
#include <chrono>

template <typename Key, typename Value>
class LRUCache {
private:
    struct CacheEntry {
        Value value;
        std::chrono::time_point<std::chrono::high_resolution_clock> lastAccessTime;
        std::chrono::time_point<std::chrono::high_resolution_clock> expirationTime;
    };

    std::list<Key> _keyList; // Stores keys in LRU order (front is MRU, back is LRU)
    std::unordered_map<Key, typename std::list<Key>::iterator> _keyMap; // Maps key to its position in _keyList
    std::unordered_map<Key, CacheEntry> _cacheMap; // Maps key to its value and metadata

    size_t _capacity;
    std::chrono::seconds _ttl; // Time-to-live for cache entries

    std::mutex _mutex; // Protects access to cache

    void touch(const Key& key) {
        // Move key to the front of the list (Most Recently Used)
        _keyList.splice(_keyList.begin(), _keyList, _keyMap[key]);
        _cacheMap[key].lastAccessTime = std::chrono::high_resolution_clock::now();
    }

    void evictIfNeeded() {
        // Evict LRU items if capacity exceeded
        while (_cacheMap.size() > _capacity) {
            Key lruKey = _keyList.back();
            _keyList.pop_back();
            _keyMap.erase(lruKey);
            _cacheMap.erase(lruKey);
        }
    }

    void cleanupExpired() {
        auto now = std::chrono::high_resolution_clock::now();
        std::vector<Key> expiredKeys;
        for (const auto& pair : _cacheMap) {
            if (pair.second.expirationTime < now) {
                expiredKeys.push_back(pair.first);
            }
        }
        for (const Key& key : expiredKeys) {
            _keyList.erase(_keyMap[key]);
            _keyMap.erase(key);
            _cacheMap.erase(key);
        }
    }

public:
    LRUCache(size_t capacity, std::chrono::seconds ttl) : _capacity(capacity), _ttl(ttl) {}

    void put(const Key& key, const Value& value) {
        std::lock_guard<std::mutex> lock(_mutex);
        cleanupExpired(); // Clean up expired items before adding
        
        auto it = _cacheMap.find(key);
        if (it != _cacheMap.end()) {
            // Update existing entry
            it->second.value = value;
            it->second.lastAccessTime = std::chrono::high_resolution_clock::now();
            it->second.expirationTime = it->second.lastAccessTime + _ttl;
            touch(key);
        } else {
            // Add new entry
            _keyList.push_front(key);
            _keyMap[key] = _keyList.begin();
            _cacheMap[key] = {value, std::chrono::high_resolution_clock::now(), std::chrono::high_resolution_clock::now() + _ttl};
            evictIfNeeded();
        }
    }

    std::optional<Value> get(const Key& key) {
        std::lock_guard<std::mutex> lock(_mutex);
        cleanupExpired(); // Clean up expired items on access

        auto it = _cacheMap.find(key);
        if (it == _cacheMap.end()) {
            return std::nullopt; // Not found
        }
        
        if (it->second.expirationTime < std::chrono::high_resolution_clock::now()) {
            // Found but expired, remove it
            _keyList.erase(_keyMap[key]);
            _keyMap.erase(key);
            _cacheMap.erase(key);
            return std::nullopt;
        }

        touch(key); // Mark as most recently used
        return it->second.value;
    }

    void remove(const Key& key) {
        std::lock_guard<std::mutex> lock(_mutex);
        auto it = _cacheMap.find(key);
        if (it != _cacheMap.end()) {
            _keyList.erase(_keyMap[key]);
            _keyMap.erase(key);
            _cacheMap.erase(key);
        }
    }

    size_t size() const {
        std::lock_guard<std::mutex> lock(_mutex);
        return _cacheMap.size();
    }

    size_t capacity() const {
        return _capacity;
    }

    void clear() {
        std::lock_guard<std::mutex> lock(_mutex);
        _keyList.clear();
        _keyMap.clear();
        _cacheMap.clear();
    }
};

#endif // WEBSCRAPER_LRU_CACHE_H
```