```cpp
#ifndef WEBSCRAPER_SCRAPING_TARGET_H
#define WEBSCRAPER_SCRAPING_TARGET_H

#include <string>
#include <map>
#include <chrono>
#include <nlohmann/json.hpp>

struct ScrapingTarget {
    std::string id;
    std::string jobId;
    std::string url;
    std::string method; // e.g., "GET", "POST"
    std::string payload; // JSON string for POST requests
    std::map<std::string, std::string> headers; // HTTP headers
    std::map<std::string, std::string> selectors; // CSS selectors for data extraction
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;

    ScrapingTarget() = default;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["id"] = id;
        j["jobId"] = jobId;
        j["url"] = url;
        j["method"] = method;
        j["payload"] = payload;
        j["headers"] = headers;
        j["selectors"] = selectors;
        j["createdAt"] = std::chrono::duration_cast<std::chrono::seconds>(createdAt.time_since_epoch()).count();
        j["updatedAt"] = std::chrono::duration_cast<std::chrono::seconds>(updatedAt.time_since_epoch()).count();
        return j;
    }
};

#endif // WEBSCRAPER_SCRAPING_TARGET_H
```