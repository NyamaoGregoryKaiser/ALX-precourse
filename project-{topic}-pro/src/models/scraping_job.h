```cpp
#ifndef WEBSCRAPER_SCRAPING_JOB_H
#define WEBSCRAPER_SCRAPING_JOB_H

#include <string>
#include <vector>
#include <chrono>
#include <nlohmann/json.hpp>

// Forward declaration for ScrapingTarget to avoid circular include in headers
struct ScrapingTarget;

struct ScrapingJob {
    std::string id;
    std::string userId;
    std::string name;
    std::string description;
    std::string status; // e.g., "pending", "running", "completed", "failed"
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::chrono::system_clock::time_point lastRunAt; // When the job last ran
    int runIntervalSeconds; // How often to run, 0 for one-time
    bool isActive;

    // Optional: targets can be loaded separately
    std::vector<ScrapingTarget> targets;

    ScrapingJob() = default;

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["id"] = id;
        j["userId"] = userId;
        j["name"] = name;
        j["description"] = description;
        j["status"] = status;
        j["createdAt"] = std::chrono::duration_cast<std::chrono::seconds>(createdAt.time_since_epoch()).count();
        j["updatedAt"] = std::chrono::duration_cast<std::chrono::seconds>(updatedAt.time_since_epoch()).count();
        j["lastRunAt"] = std::chrono::duration_cast<std::chrono::seconds>(lastRunAt.time_since_epoch()).count();
        j["runIntervalSeconds"] = runIntervalSeconds;
        j["isActive"] = isActive;

        // Convert targets if they are loaded
        nlohmann::json targets_json_array = nlohmann::json::array();
        for (const auto& target : targets) {
            targets_json_array.push_back(target.toJson());
        }
        j["targets"] = targets_json_array;

        return j;
    }
};

#endif // WEBSCRAPER_SCRAPING_JOB_H
```