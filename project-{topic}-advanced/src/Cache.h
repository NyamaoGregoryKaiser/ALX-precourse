```cpp
#ifndef VISGENIUS_CACHE_H
#define VISGENIUS_CACHE_H

#include <string>
#include <map>
#include <mutex>
#include <chrono>
#include <optional>

#include "Logger.h"

namespace VisGenius {

template <typename T>
struct CacheEntry {
    T value;
    std::chrono::steady_clock::time_point expiry_time;
};

template <typename T>
class Cache {
public:
    Cache(std::chrono::seconds default_ttl = std::chrono::minutes(5));

    void put(const std::string& key, const T& value, std::chrono::seconds ttl_override = std::chrono::seconds(0));
    std::optional<T> get(const std::string& key);
    bool remove(const std::string& key);
    void clear();
    void cleanupExpired();

private:
    std::map<std::string, CacheEntry<T>> m_cache;
    std::mutex m_mutex;
    std::chrono::seconds m_defaultTtl;

    bool isExpired(const CacheEntry<T>& entry) const;
};

// Explicit template instantiations for common types used in the system
// This avoids needing to put all implementation in header for template classes.
// For example:
// extern template class Cache<std::string>;
// extern template class Cache<VisGenius::DataTable>;
// extern template class Cache<VisGenius::ChartData>;
// ... but for simplicity, we'll keep the implementation in the header for generic template.
// A real project would typically include the .ipp file at the end of the header
// or explicitly instantiate in a .cpp file.
// For this example, to ensure full code in one response, we'll put the impl here.

template <typename T>
Cache<T>::Cache(std::chrono::seconds default_ttl) : m_defaultTtl(default_ttl) {
    LOG_INFO("Cache initialized with default TTL: {} seconds", default_ttl.count());
}

template <typename T>
void Cache<T>::put(const std::string& key, const T& value, std::chrono::seconds ttl_override) {
    std::lock_guard<std::mutex> lock(m_mutex);
    CacheEntry<T> entry;
    entry.value = value;
    std::chrono::seconds actual_ttl = (ttl_override.count() > 0) ? ttl_override : m_defaultTtl;
    entry.expiry_time = std::chrono::steady_clock::now() + actual_ttl;
    m_cache[key] = entry;
    LOG_DEBUG("Cache: Put key '{}' with TTL {}s", key, actual_ttl.count());
}

template <typename T>
std::optional<T> Cache<T>::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_cache.find(key);
    if (it == m_cache.end()) {
        LOG_DEBUG("Cache: Key '{}' not found.", key);
        return std::nullopt;
    }

    if (isExpired(it->second)) {
        LOG_DEBUG("Cache: Key '{}' expired, removing.", key);
        m_cache.erase(it);
        return std::nullopt;
    }
    LOG_DEBUG("Cache: Retrieved key '{}'.", key);
    return it->second.value;
}

template <typename T>
bool Cache<T>::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(m_mutex);
    LOG_DEBUG("Cache: Removing key '{}'.", key);
    return m_cache.erase(key) > 0;
}

template <typename T>
void Cache<T>::clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    LOG_INFO("Cache: Clearing all entries ({} entries).", m_cache.size());
    m_cache.clear();
}

template <typename T>
void Cache<T>::cleanupExpired() {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto now = std::chrono::steady_clock::now();
    size_t removed_count = 0;
    for (auto it = m_cache.begin(); it != m_cache.end(); ) {
        if (it->second.expiry_time < now) {
            it = m_cache.erase(it);
            removed_count++;
        } else {
            ++it;
        }
    }
    if (removed_count > 0) {
        LOG_INFO("Cache: Cleaned up {} expired entries.", removed_count);
    }
}

template <typename T>
bool Cache<T>::isExpired(const CacheEntry<T>& entry) const {
    return std::chrono::steady_clock::now() > entry.expiry_time;
}

} // namespace VisGenius

#endif // VISGENIUS_CACHE_H
```