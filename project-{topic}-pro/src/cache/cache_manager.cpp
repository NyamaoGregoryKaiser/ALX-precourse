```cpp
#include "cache_manager.h"
#include "../common/config.h"
#include "../common/logger.h"

CacheManager& CacheManager::getInstance() {
    static CacheManager instance;
    return instance;
}

CacheManager::CacheManager() : 
    apiResponseCache(
        Config::getInstance().getInt("cache.max_items", 100),
        std::chrono::seconds(Config::getInstance().getInt("cache.ttl_seconds", 300))
    )
{
    Logger::info("CacheManager", "CacheManager initialized. Max items: {}, TTL: {}s.",
                 apiResponseCache.capacity(), Config::getInstance().getInt("cache.ttl_seconds"));
}

LRUCache<std::string, nlohmann::json>& CacheManager::getApiResponseCache() {
    return apiResponseCache;
}
```