```cpp
#ifndef WEBSCRAPER_CACHE_MANAGER_H
#define WEBSCRAPER_CACHE_MANAGER_H

#include "lru_cache.h"
#include <string>
#include <memory>
#include <nlohmann/json.hpp> // For caching JSON responses

class CacheManager {
public:
    static CacheManager& getInstance();
    CacheManager(const CacheManager&) = delete;
    CacheManager& operator=(const CacheManager&) = delete;

    LRUCache<std::string, nlohmann::json>& getApiResponseCache();

private:
    CacheManager();

    LRUCache<std::string, nlohmann::json> apiResponseCache;
};

#endif // WEBSCRAPER_CACHE_MANAGER_H
```