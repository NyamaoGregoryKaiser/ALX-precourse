#pragma once

#include <string>
#include <map>
#include <chrono>
#include <optional>

struct ScrapedItem {
    int id = 0;
    int job_id = 0;
    std::string url; // The actual URL from which this item was scraped (could be different from job's target_url if following links)
    std::map<std::string, std::string> data; // Key-value pairs of scraped data (e.g., "title": "Product X")
    std::chrono::system_clock::time_point scraped_at;
    std::optional<std::string> raw_html_fragment; // Store part of HTML if needed for debugging/re-parsing
};