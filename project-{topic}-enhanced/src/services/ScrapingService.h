#pragma once

#include "models/ScrapeJob.h"
#include "models/ScrapedItem.h"
#include "scraper/WebScraper.h"
#include "database/ScrapeJobRepository.h"
#include "database/ScrapedItemRepository.h"
#include "cache/CacheManager.h"

#include <vector>
#include <string>
#include <optional>
#include <future> // For asynchronous scraping

class ScrapingService {
public:
    ScrapingService();

    // CRUD for ScrapeJobs
    std::optional<ScrapeJob> create_job(const ScrapeJob& job);
    std::optional<ScrapeJob> get_job(int job_id, int user_id); // User ID for authorization
    std::vector<ScrapeJob> get_all_jobs(int user_id);
    bool update_job(const ScrapeJob& job, int user_id);
    bool delete_job(int job_id, int user_id);

    // Get scraped items for a job
    std::vector<ScrapedItem> get_scraped_items_for_job(int job_id, int user_id);

    // Initiate a scrape manually (can be called by scheduler or API)
    std::future<bool> trigger_scrape(int job_id);
    std::future<bool> trigger_scrape(const ScrapeJob& job); // Overload for internal use

private:
    WebScraper web_scraper_;
    ScrapeJobRepository job_repo_;
    ScrapedItemRepository item_repo_;
    CacheManager& cache_manager_; // Reference to the singleton CacheManager

    // Internal helper for actual scraping logic
    bool perform_scrape_and_store(const ScrapeJob& job);
};