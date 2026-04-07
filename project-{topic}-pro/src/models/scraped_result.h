```cpp
#ifndef WEBSCRAPER_SCRAPED_RESULT_H
#define WEBSCRAPER_SCRAPED_RESULT_H

#include <string>
#include <map>
#include <chrono>
#include <nlohmann/json.hpp>

struct ScrapedResult {
    std::string id;
    std::string jobId;
    std::string targetId;
    std::string data; // JSON string of scraped data
    std::chrono::system_clock::time_point createdAt;

    ScrapedResult() = default;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["id"] = id;
        j["jobId"] = jobId;
        j["targetId"] = targetId;
        
        // Attempt to parse 'data' as JSON if it's valid, otherwise treat as string
        try {
            j["data"] = nlohmann::json::parse(data);
        } catch (const nlohmann::json::parse_error& e) {
            j["data"] = data; // Store as string if not valid JSON
        }
        
        j["createdAt"] = std::chrono::duration_cast<std::chrono::seconds>(createdAt.time_since_epoch()).count();
        return j;
    }
};

#endif // WEBSCRAPER_SCRAPED_RESULT_H
```