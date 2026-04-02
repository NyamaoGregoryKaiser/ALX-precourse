```cpp
#include "Cache.h"
#include "../config/AppConfig.h"

namespace TaskManager {
namespace Cache {

Cache::Cache() : default_ttl(0) {
    // Constructor is private, instance created via getInstance()
}

Cache& Cache::getInstance() {
    static Cache instance;
    return instance;
}

void Cache::init(long long default_ttl_seconds) {
    std::lock_guard<std::mutex> lock(cache_mutex);
    default_ttl = default_ttl_seconds;
    Utils::Logger::getLogger()->info("Cache initialized with default TTL: {} seconds.", default_ttl);
}

void Cache::set(const std::string& key, const nlohmann::json& value) {
    std::lock_guard<std::mutex> lock(cache_mutex);
    if (default_ttl <= 0) { // If TTL is 0 or less, cache is effectively disabled
        Utils::Logger::getLogger()->debug("Cache disabled, not setting key: {}", key);
        return;
    }

    CacheEntry entry;
    entry.data = value;
    entry.expiration_time = std::chrono::steady_clock::now() + std::chrono::seconds(default_ttl);
    cache_map[key] = entry;
    Utils::Logger::getLogger()->debug("Cache set key: {}", key);
}

std::optional<nlohmann::json> Cache::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(cache_mutex);
    if (default_ttl <= 0) { // If TTL is 0 or less, cache is effectively disabled
        Utils::Logger::getLogger()->debug("Cache disabled, not getting key: {}", key);
        return std::nullopt;
    }

    auto it = cache_map.find(key);
    if (it != cache_map.end()) {
        if (std::chrono::steady_clock::now() < it->second.expiration_time) {
            Utils::Logger::getLogger()->debug("Cache hit for key: {}", key);
            return it->second.data;
        } else {
            Utils::Logger::getLogger()->debug("Cache expired for key: {}", key);
            cache_map.erase(it); // Remove expired entry
        }
    }
    Utils::Logger::getLogger()->debug("Cache miss for key: {}", key);
    return std::nullopt;
}

void Cache::remove(const std::string& key) {
    std::lock_guard<std::mutex> lock(cache_mutex);
    auto it = cache_map.find(key);
    if (it != cache_map.end()) {
        cache_map.erase(it);
        Utils::Logger::getLogger()->debug("Cache removed key: {}", key);
    }
}

void Cache::clear() {
    std::lock_guard<std::mutex> lock(cache_mutex);
    cache_map.clear();
    Utils::Logger::getLogger()->info("Cache cleared.");
}

size_t Cache::size() const {
    std::lock_guard<std::mutex> lock(cache_mutex);
    return cache_map.size();
}

} // namespace Cache
} // namespace TaskManager
```