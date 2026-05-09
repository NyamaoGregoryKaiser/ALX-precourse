```cpp
#include "CacheManager.h"
#include "core/config/ConfigManager.h"

namespace VisuFlow {
namespace Core {
namespace Cache {

CacheManager::CacheManager(long long defaultTtlSeconds)
    : m_defaultTtlSeconds(defaultTtlSeconds) {
    auto& config = Core::Config::ConfigManager::getInstance();
    m_defaultTtlSeconds = config.getLong("cache_default_ttl_seconds", defaultTtlSeconds);
    VisuFlow::Util::Logger::log(spdlog::level::info, "CacheManager initialized with default TTL: {} seconds.", m_defaultTtlSeconds);
}

void CacheManager::put(const std::string& key, const std::string& value, long long ttlSeconds) {
    std::lock_guard<std::mutex> lock(m_mutex);
    long long actualTtl = (ttlSeconds > 0) ? ttlSeconds : m_defaultTtlSeconds;
    auto expiryTime = std::chrono::steady_clock::now() + std::chrono::seconds(actualTtl);
    m_cache[key] = {value, expiryTime};
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Cache: Put key '{}' with TTL {}s.", key, actualTtl);
}

std::optional<std::string> CacheManager::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_cache.find(key);
    if (it != m_cache.end()) {
        if (!isExpired(it->second)) {
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Cache: Hit for key '{}'.", key);
            return it->second.value;
        } else {
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Cache: Key '{}' found but expired. Removing.", key);
            m_cache.erase(it);
        }
    }
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Cache: Miss for key '{}'.", key);
    return std::nullopt;
}

void CacheManager::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_cache.count(key)) {
        m_cache.erase(key);
        VisuFlow::Util::Logger::log(spdlog::level::debug, "Cache: Removed key '{}'.", key);
    }
}

void CacheManager::clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_cache.clear();
    VisuFlow::Util::Logger::log(spdlog::level::info, "Cache: All entries cleared.");
}

size_t CacheManager::size() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_cache.size();
}

bool CacheManager::isExpired(const CacheEntry& entry) const {
    return std::chrono::steady_clock::now() > entry.expiryTime;
}

void CacheManager::cleanupExpiredEntries() {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_cache.begin();
    while (it != m_cache.end()) {
        if (isExpired(it->second)) {
            it = m_cache.erase(it);
        } else {
            ++it;
        }
    }
}

} // namespace Cache
} // namespace Core
} // namespace VisuFlow
```