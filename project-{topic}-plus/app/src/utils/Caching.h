#ifndef CACHING_H
#define CACHING_H

#include <string>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <optional>
#include "Logger.h"
#include "../app_config.h"

namespace Cache {

    // Cache entry structure
    struct CacheEntry {
        std::string value;
        std::chrono::steady_clock::time_point expiry_time;
    };

    // Simple in-memory cache
    class InMemoryCache {
    private:
        std::unordered_map<std::string, CacheEntry> cache_map;
        std::mutex cache_mutex;
        std::chrono::seconds default_ttl; // Time-To-Live

    public:
        InMemoryCache(std::chrono::seconds ttl = AppConfig::CACHE_TTL_SECONDS) : default_ttl(ttl) {
            LOG_INFO("Cache initialized with default TTL: {} seconds", default_ttl.count());
        }

        /**
         * @brief Sets a value in the cache with a specific key and optional TTL.
         * @param key The key to store the value under.
         * @param value The string value to store.
         * @param ttl Optional TTL for this specific entry. Defaults to the cache's default TTL.
         */
        void set(const std::string& key, const std::string& value,
                 std::optional<std::chrono::seconds> ttl = std::nullopt) {
            std::lock_guard<std::mutex> lock(cache_mutex);
            CacheEntry entry;
            entry.value = value;
            entry.expiry_time = std::chrono::steady_clock::now() + (ttl.value_or(default_ttl));
            cache_map[key] = entry;
            LOG_DEBUG("Cache SET: key='{}', TTL={}s", key, (ttl.value_or(default_ttl)).count());
        }

        /**
         * @brief Retrieves a value from the cache.
         * @param key The key to retrieve.
         * @return An optional string. Contains the value if found and not expired, std::nullopt otherwise.
         */
        std::optional<std::string> get(const std::string& key) {
            std::lock_guard<std::mutex> lock(cache_mutex);
            auto it = cache_map.find(key);
            if (it != cache_map.end()) {
                if (it->second.expiry_time > std::chrono::steady_clock::now()) {
                    LOG_DEBUG("Cache HIT: key='{}'", key);
                    return it->second.value;
                } else {
                    LOG_DEBUG("Cache EXPIRED: key='{}'", key);
                    cache_map.erase(it); // Remove expired item
                }
            }
            LOG_DEBUG("Cache MISS: key='{}'", key);
            return std::nullopt;
        }

        /**
         * @brief Removes a value from the cache.
         * @param key The key to remove.
         * @return True if the key was found and removed, false otherwise.
         */
        bool remove(const std::string& key) {
            std::lock_guard<std::mutex> lock(cache_mutex);
            bool removed = cache_map.erase(key) > 0;
            if (removed) {
                LOG_DEBUG("Cache REMOVE: key='{}'", key);
            }
            return removed;
        }

        /**
         * @brief Clears all entries from the cache.
         */
        void clear() {
            std::lock_guard<std::mutex> lock(cache_mutex);
            LOG_INFO("Cache CLEARED. {} items removed.", cache_map.size());
            cache_map.clear();
        }

        /**
         * @brief Returns the current number of active entries in the cache.
         * @return The size of the cache.
         */
        size_t size() const {
            std::lock_guard<std::mutex> lock(cache_mutex);
            return cache_map.size();
        }

        /**
         * @brief Prunes expired entries from the cache.
         * This function can be called periodically or before 'get' operations.
         */
        void prune() {
            std::lock_guard<std::mutex> lock(cache_mutex);
            auto now = std::chrono::steady_clock::now();
            size_t initial_size = cache_map.size();
            for (auto it = cache_map.begin(); it != cache_map.end(); ) {
                if (it->second.expiry_time <= now) {
                    it = cache_map.erase(it);
                } else {
                    ++it;
                }
            }
            if (cache_map.size() < initial_size) {
                LOG_DEBUG("Cache PRUNED. {} items removed.", initial_size - cache_map.size());
            }
        }
    };

    // Global cache instance
    inline InMemoryCache app_cache(AppConfig::CACHE_TTL_SECONDS);

} // namespace Cache

#endif // CACHING_H