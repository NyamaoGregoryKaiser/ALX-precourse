```cpp
#ifndef CACHESERVICE_H
#define CACHESERVICE_H

#include <string>
#include <unordered_map>
#include <list>
#include <mutex>
#include <chrono>
#include <optional>

#include "../utils/Logger.h"

// Entry for the LRU Cache
struct CacheEntry {
    std::string value;
    std::chrono::steady_clock::time_point expires_at;
};

// Implements a simple LRU (Least Recently Used) cache with TTL (Time To Live)
class CacheService {
public:
    static void init(size_t capacity, int ttl_seconds) {
        std::lock_guard<std::mutex> lock(mtx);
        CacheService::capacity = capacity;
        CacheService::ttl_seconds = ttl_seconds;
        LOG_INFO("CacheService initialized with capacity {} and TTL {} seconds.", capacity, ttl_seconds);
    }

    static void set(const std::string& key, const std::string& value) {
        std::lock_guard<std::mutex> lock(mtx);
        
        auto it = cache_map.find(key);
        if (it != cache_map.end()) {
            // Key exists, update value and move to front (most recently used)
            cache_list.erase(it->second.first);
            cache_map.erase(it);
        } else if (cache_map.size() >= capacity) {
            // Cache is full, evict LRU item
            std::string lru_key = cache_list.back().first;
            cache_map.erase(lru_key);
            cache_list.pop_back();
            LOG_DEBUG("Cache evicted LRU item: {}", lru_key);
        }

        // Add new item (or updated item) to front of list and map
        auto now = std::chrono::steady_clock::now();
        cache_list.push_front({key, {value, now + std::chrono::seconds(ttl_seconds)}});
        cache_map[key] = {cache_list.begin(), now};
        LOG_DEBUG("Cache set: {}", key);
    }

    static std::optional<std::string> get(const std::string& key) {
        std::lock_guard<std::mutex> lock(mtx);
        
        auto it = cache_map.find(key);
        if (it == cache_map.end()) {
            return std::nullopt; // Not found
        }

        // Check TTL
        if (std::chrono::steady_clock::now() > it->second.first->second.expires_at) {
            // Expired, remove from cache
            LOG_DEBUG("Cache entry for {} expired. Removing.", key);
            cache_list.erase(it->second.first);
            cache_map.erase(it);
            return std::nullopt;
        }

        // Move to front (most recently used)
        cache_list.splice(cache_list.begin(), cache_list, it->second.first);
        it->second.second = std::chrono::steady_clock::now(); // Update last accessed time
        LOG_DEBUG("Cache hit: {}", key);
        return it->second.first->second.value;
    }

    static void remove(const std::string& key) {
        std::lock_guard<std::mutex> lock(mtx);
        auto it = cache_map.find(key);
        if (it != cache_map.end()) {
            cache_list.erase(it->second.first);
            cache_map.erase(it);
            LOG_DEBUG("Cache removed: {}", key);
        }
    }

    static void clear() {
        std::lock_guard<std::mutex> lock(mtx);
        cache_map.clear();
        cache_list.clear();
        LOG_INFO("Cache cleared.");
    }

    static size_t size() {
        std::lock_guard<std::mutex> lock(mtx);
        return cache_map.size();
    }

private:
    static size_t capacity;
    static int ttl_seconds;
    static std::list<std::pair<std::string, CacheEntry>> cache_list; // Stores (key, CacheEntry) for LRU order
    static std::unordered_map<std::string, std::pair<std::list<std::pair<std::string, CacheEntry>>::iterator, std::chrono::steady_clock::time_point>> cache_map; // Stores (key -> (list_iterator, last_accessed_time))
    static std::mutex mtx;

    CacheService() = delete; // Prevent instantiation
};

// Static member initialization
size_t CacheService::capacity = 0;
int CacheService::ttl_seconds = 0;
std::list<std::pair<std::string, CacheEntry>> CacheService::cache_list;
std::unordered_map<std::string, std::pair<std::list<std::pair<std::string, CacheEntry>>::iterator, std::chrono::steady_clock::time_point>> CacheService::cache_map;
std::mutex CacheService::mtx;

#endif // CACHESERVICE_H
```