```cpp
#ifndef WEBSCRAPER_SCRAPER_CORE_H
#define WEBSCRAPER_SCRAPER_CORE_H

#include <string>
#include <map>
#include <vector>
#include <nlohmann/json.hpp>
#include <curl/curl.h> // libcurl
#include "../models/scraping_target.h"
#include "../common/logger.h"
#include "../common/error_handler.h"
#include "../common/config.h"
#include "html_parser.h"

class ScraperCore {
public:
    ScraperCore();
    ~ScraperCore();

    nlohmann::json scrape(const ScrapingTarget& target);

private:
    CURL* curl; // libcurl handle
    int maxRetries;
    int retryDelayMs;

    // Callback for libcurl to write received data
    static size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp);
};

#endif // WEBSCRAPER_SCRAPER_CORE_H
```