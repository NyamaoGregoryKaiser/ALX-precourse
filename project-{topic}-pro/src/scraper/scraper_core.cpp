```cpp
#include "scraper_core.h"
#include <thread>
#include <chrono>

ScraperCore::ScraperCore() {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();
    if (!curl) {
        Logger::critical("ScraperCore", "Failed to initialize libcurl.");
        throw std::runtime_error("Failed to initialize libcurl.");
    }
    maxRetries = Config::getInstance().getInt("scraper.max_retries", 3);
    retryDelayMs = Config::getInstance().getInt("scraper.retry_delay_ms", 1000);
    Logger::info("ScraperCore", "ScraperCore initialized. Max retries: {}, Retry delay: {}ms", maxRetries, retryDelayMs);
}

ScraperCore::~ScraperCore() {
    if (curl) {
        curl_easy_cleanup(curl);
    }
    curl_global_cleanup();
    Logger::info("ScraperCore", "ScraperCore shut down.");
}

size_t ScraperCore::writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

nlohmann::json ScraperCore::scrape(const ScrapingTarget& target) {
    std::string htmlContent;
    CURLcode res;
    long http_code = 0;
    int currentRetry = 0;

    do {
        htmlContent.clear(); // Clear content for retries

        curl_easy_setopt(curl, CURLOPT_URL, target.url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &htmlContent);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); // Follow redirects
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L); // Max 30 seconds for request
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "Mozilla/5.0 (compatible; WebScraper/1.0)"); // Good practice

        // Set HTTP method
        if (target.method == "POST") {
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, target.payload.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, target.payload.length());
        } else { // Default to GET
            curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        }

        // Set custom headers
        struct curl_slist *headers = nullptr;
        for (const auto& header : target.headers) {
            std::string header_str = header.first + ": " + header.second;
            headers = curl_slist_append(headers, header_str.c_str());
        }
        headers = curl_slist_append(headers, "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        headers = curl_slist_append(headers, "Accept-Language: en-US,en;q=0.5");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        res = curl_easy_perform(curl);
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
        curl_slist_free_all(headers); // Clean up headers

        if (res != CURLE_OK || (http_code >= 400 && http_code != 404)) { // Retry on error or server-side issues (excluding 404 if content might be missing)
            Logger::warn("ScraperCore", "Scraping target '{}' failed (HTTP: {}, cURL: {}). Retrying {}/{}",
                         target.url, http_code, curl_easy_strerror(res), currentRetry + 1, maxRetries);
            std::this_thread::sleep_for(std::chrono::milliseconds(retryDelayMs));
            currentRetry++;
        } else {
            break; // Success or non-retriable error (like 404)
        }

    } while (currentRetry < maxRetries);

    if (res != CURLE_OK) {
        throw ServiceUnavailableException("Failed to fetch URL after retries: " + std::string(curl_easy_strerror(res)));
    }
    if (http_code >= 400) {
        throw ServiceUnavailableException("HTTP error fetching URL: " + std::to_string(http_code));
    }

    // Now parse and extract data
    if (htmlContent.empty()) {
        Logger::warn("ScraperCore", "Fetched empty HTML content for URL: {}", target.url);
        return nlohmann::json();
    }

    Logger::debug("ScraperCore", "Successfully fetched HTML from {}. Content size: {} bytes. Parsing...", target.url, htmlContent.length());
    return HTMLParser::parseAndExtract(htmlContent, target.selectors);
}
```