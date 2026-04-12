#include "ScrapingService.h"
#include "utils/Logger.h"
#include <thread>
#include <chrono>

ScrapingService::ScrapingService() : cache_manager_(CacheManager::get_instance()) {}

std::optional<ScrapeJob> ScrapingService::create_job(const ScrapeJob& job) {
    LOG_INFO("Attempting to create scrape job for user {}: {}", job.user_id, job.name);
    return job_repo_.create_job(job);
}

std::optional<ScrapeJob> ScrapingService::get_job(int job_id, int user_id) {
    auto job_opt = job_repo_.find_by_id(job_id);
    if (job_opt && job_opt->user_id == user_id) {
        LOG_DEBUG("Retrieved scrape job {} for user {}", job_id, user_id);
        return job_opt;
    }
    LOG_WARN("Scrape job {} not found or unauthorized for user {}", job_id, user_id);
    return std::nullopt;
}

std::vector<ScrapeJob> ScrapingService::get_all_jobs(int user_id) {
    LOG_DEBUG("Retrieving all scrape jobs for user {}", user_id);
    return job_repo_.find_by_user_id(user_id);
}

bool ScrapingService::update_job(const ScrapeJob& job, int user_id) {
    auto existing_job_opt = job_repo_.find_by_id(job.id);
    if (!existing_job_opt || existing_job_opt->user_id != user_id) {
        LOG_WARN("Attempted to update job {} by user {} but job not found or unauthorized.", job.id, user_id);
        return false;
    }
    LOG_INFO("Attempting to update scrape job {} for user {}", job.id, user_id);
    return job_repo_.update_job(job);
}

bool ScrapingService::delete_job(int job_id, int user_id) {
    auto existing_job_opt = job_repo_.find_by_id(job_id);
    if (!existing_job_opt || existing_job_opt->user_id != user_id) {
        LOG_WARN("Attempted to delete job {} by user {} but job not found or unauthorized.", job_id, user_id);
        return false;
    }
    LOG_INFO("Attempting to delete scrape job {} for user {}", job_id, user_id);
    return job_repo_.delete_job(job_id);
}

std::vector<ScrapedItem> ScrapingService::get_scraped_items_for_job(int job_id, int user_id) {
    auto job_opt = job_repo_.find_by_id(job_id);
    if (!job_opt || job_opt->user_id != user_id) {
        LOG_WARN("Attempted to get scraped items for job {} by user {} but job not found or unauthorized.", job_id, user_id);
        return {};
    }
    LOG_DEBUG("Retrieving scraped items for job {} (user {})", job_id, user_id);
    return item_repo_.find_by_job_id(job_id);
}

std::future<bool> ScrapingService::trigger_scrape(int job_id) {
    auto job_opt = job_repo_.find_by_id(job_id);
    if (!job_opt) {
        LOG_ERROR("Trigger scrape failed: Job {} not found.", job_id);
        // Return a future that is immediately ready with false
        std::promise<bool> p;
        p.set_value(false);
        return p.get_future();
    }
    return trigger_scrape(job_opt.value());
}

std::future<bool> ScrapingService::trigger_scrape(const ScrapeJob& job) {
    // Run the scrape in a separate thread to avoid blocking the API
    return std::async(std::launch::async, [this, job]() {
        return perform_scrape_and_store(job);
    });
}

bool ScrapingService::perform_scrape_and_store(const ScrapeJob& job) {
    LOG_INFO("Executing scrape job '{}' (ID: {})", job.name, job.id);
    ScrapeJob current_job = job; // Create a mutable copy

    // Update job status to RUNNING
    current_job.status = ScrapeJobStatus::RUNNING;
    current_job.last_run_at = std::chrono::system_clock::now();
    job_repo_.update_job_status(current_job.id, current_job.status, current_job.last_run_at, std::nullopt);

    try {
        // Cache check (if configured and enabled)
        std::string cache_key = "scrape_result:" + std::to_string(job.id);
        if (cache_manager_.is_initialized()) {
            std::optional<std::string> cached_data = cache_manager_.get(cache_key);
            if (cached_data) {
                // In a real scenario, this would involve deserializing the JSON string
                // back into ScrapedItem objects. For now, just log hit.
                LOG_INFO("Cache hit for job '{}' (ID: {}). Using cached data.", job.name, job.id);
                current_job.status = ScrapeJobStatus::COMPLETED; // Still marks as completed
                job_repo_.update_job_status(current_job.id, current_job.status, current_job.last_run_at, std::nullopt);
                return true; // Assume cache hit means successful "scrape"
            }
        }

        std::vector<ScrapedItem> items = web_scraper_.scrape(job);

        if (!items.empty()) {
            for (const auto& item : items) {
                item_repo_.create_item(item);
            }
            // Store results in cache (for a limited time)
            if (cache_manager_.is_initialized()) {
                // In a real project, serialize items to JSON string
                // For now, a placeholder for the cached value.
                std::string items_json_str = "{\"status\": \"cached\", \"count\": " + std::to_string(items.size()) + "}";
                cache_manager_.set(cache_key, items_json_str, 3600); // Cache for 1 hour
            }
            current_job.status = ScrapeJobStatus::COMPLETED;
            LOG_INFO("Scrape job '{}' (ID: {}) completed successfully. {} items stored.", job.name, job.id, items.size());
            return true;
        } else {
            current_job.status = ScrapeJobStatus::FAILED;
            current_job.last_error = "No items extracted.";
            LOG_WARN("Scrape job '{}' (ID: {}) completed with no items extracted.", job.name, job.id);
            return false;
        }
    } catch (const std::exception& e) {
        current_job.status = ScrapeJobStatus::FAILED;
        current_job.last_error = e.what();
        LOG_CRITICAL("Scrape job '{}' (ID: {}) failed with exception: {}", job.name, job.id, e.what());
        return false;
    } finally {
        // Ensure status is updated even if an exception occurs
        job_repo_.update_job_status(current_job.id, current_job.status, current_job.last_run_at, current_job.last_error);
    }
}