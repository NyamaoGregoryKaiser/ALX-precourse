#include "WebScraper.h"
#include "utils/Logger.h"
#include <algorithm> // For std::trim, if needed
#include <regex>     // For more advanced selector parsing if HTMLParser evolved

std::vector<ScrapedItem> WebScraper::scrape(const ScrapeJob& job) {
    std::vector<ScrapedItem> scraped_items;

    LOG_INFO("Starting scrape job '{}' for URL: {}", job.name, job.target_url);

    HttpUtils::HttpResponse http_response = HttpUtils::get(job.target_url);

    if (!http_response.is_success()) {
        LOG_ERROR("Failed to fetch URL '{}' for job '{}'. Status: {}, Error: {}",
                  job.target_url, job.name, http_response.status_code, http_response.error_message);
        return {};
    }

    HTMLParser parser;
    std::optional<HTMLNode> root_node = parser.parse(http_response.body);

    if (!root_node) {
        LOG_ERROR("Failed to parse HTML for URL '{}' for job '{}'.", job.target_url, job.name);
        return {};
    }

    // Simple selector logic: assumes selectors are "key" -> "tag.class" or "tag#id"
    // For a real-world project, this would be a more sophisticated CSS selector engine
    // or XPath library integration (e.g., libxml2 with XPath).
    // Our current HTMLNode only supports tag and class/id checks.

    // A more advanced approach would iterate through results of a primary "item selector"
    // if the job expects multiple items per page. For now, we assume selectors target
    // attributes within the main page content, or a single primary item.
    // Let's assume the first selector targets the container for an item.

    if (job.selectors.empty()) {
        LOG_WARN("No selectors defined for job '{}'. Skipping data extraction.", job.name);
        return {};
    }

    // Example: If the first selector defines a "container" for items
    // e.g., selectors = { {"container_selector", "div.product-card"}, {"title", "h2"}, {"price", ".price"} }
    // This simple parser assumes we're scraping *one* main item or attributes from the page directly.
    // To scrape multiple items, the job configuration would need a "item_container_selector".

    // For now, let's assume all selectors are relative to the whole document, and we only create one item
    // with all extracted data. If multiple items are needed, the job config needs an "item_container_selector".

    ScrapedItem item;
    item.job_id = job.id;
    item.url = job.target_url;
    item.scraped_at = std::chrono::system_clock::now();
    item.data = extract_data(root_node.value(), job.selectors);

    if (!item.data.empty()) {
        scraped_items.push_back(std::move(item));
        LOG_INFO("Successfully scraped {} data points for job '{}' from {}.", item.data.size(), job.name, job.target_url);
    } else {
        LOG_WARN("No data extracted for job '{}' from {}. Check selectors.", job.name, job.target_url);
    }

    return scraped_items;
}

std::map<std::string, std::string> WebScraper::extract_data(const HTMLNode& root_node, const std::vector<std::pair<std::string, std::string>>& selectors) {
    std::map<std::string, std::string> extracted_data;

    for (const auto& selector_pair : selectors) {
        const std::string& key = selector_pair.first;
        const std::string& selector_str = selector_pair.second;

        // Very basic selector parsing for "tag.class" or "tag#id"
        // This needs to be significantly improved for real-world scenarios.
        std::string tag_name;
        std::string class_or_id;
        char type = '\0'; // '.' for class, '#' for id

        size_t dot_pos = selector_str.find('.');
        size_t hash_pos = selector_str.find('#');

        if (dot_pos != std::string::npos && (hash_pos == std::string::npos || dot_pos < hash_pos)) {
            tag_name = selector_str.substr(0, dot_pos);
            class_or_id = selector_str.substr(dot_pos + 1);
            type = '.';
        } else if (hash_pos != std::string::npos && (dot_pos == std::string::npos || hash_pos < dot_pos)) {
            tag_name = selector_str.substr(0, hash_pos);
            class_or_id = selector_str.substr(hash_pos + 1);
            type = '#';
        } else { // No class or ID, just a tag name
            tag_name = selector_str;
        }

        std::vector<HTMLNode> found_elements;
        if (type == '.') { // Search by tag and class
            found_elements = root_node.find_elements(tag_name, class_or_id);
        } else if (type == '#') { // Search by tag and ID (ID is unique, so just take first)
            for (const auto& node : root_node.find_elements(tag_name)) {
                if (node.has_id(class_or_id)) {
                    found_elements.push_back(node);
                    break; // IDs are unique
                }
            }
        } else { // Search by tag only
            found_elements = root_node.find_elements(tag_name);
        }

        if (!found_elements.empty()) {
            // Take the text content of the first matching element
            // In real scenarios, you might want specific attributes, or to concatenate text.
            extracted_data[key] = found_elements[0].text_content;
            LOG_DEBUG("Extracted '{}': '{}' for selector '{}'", key, extracted_data[key], selector_str);
        } else {
            LOG_WARN("No element found for selector '{}' (key: {})", selector_str, key);
        }
    }
    return extracted_data;
}