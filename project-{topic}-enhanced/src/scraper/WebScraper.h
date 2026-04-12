#pragma once

#include "models/ScrapeJob.h"
#include "models/ScrapedItem.h"
#include "scraper/HTMLParser.h"
#include "utils/HttpUtils.h"
#include <vector>
#include <string>
#include <map>
#include <optional>
#include <stdexcept>

class WebScraper {
public:
    WebScraper() = default;

    // Performs a single scrape job and returns extracted items
    std::vector<ScrapedItem> scrape(const ScrapeJob& job);

private:
    // Extracts data from a given HTML node based on selectors
    std::map<std::string, std::string> extract_data(const HTMLNode& node, const std::vector<std::pair<std::string, std::string>>& selectors);
};