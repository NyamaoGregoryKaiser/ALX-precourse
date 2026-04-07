```cpp
#include "scraper_service.h"

ScraperService& ScraperService::getInstance() {
    static ScraperService instance;
    return instance;
}

ScraperService::ScraperService() : jobRepo(nullptr), scraperCore(nullptr), schedulerRunning(false) {
    Logger::info("ScraperService", "ScraperService instance created.");
}

ScraperService::~ScraperService() {
    stopJobScheduler();
}

void ScraperService::initialize(JobRepository& jobRepoRef, ScraperCore& scraperCoreRef) {
    if (jobRepo || scraperCore) {
        Logger::warn("ScraperService", "ScraperService already initialized.");
        return;
    }
    jobRepo = &jobRepoRef;
    scraperCore = &scraperCoreRef;
    Logger::info("ScraperService", "ScraperService initialized with JobRepository and ScraperCore.");
}

void ScraperService::startJobScheduler() {
    if (schedulerRunning.exchange(true)) {
        Logger::warn("ScraperService", "Job scheduler already running.");
        return;
    }
    if (!jobRepo || !scraperCore) {
        Logger::critical("ScraperService", "ScraperService not initialized, cannot start scheduler.");
        schedulerRunning = false;
        return;
    }

    schedulerThread = std::thread(&ScraperService::jobSchedulerLoop, this);
    Logger::info("ScraperService", "Job scheduler started.");
}

void ScraperService::stopJobScheduler() {
    if (schedulerRunning.exchange(false)) {
        cv.notify_all(); // Wake up the thread
        if (schedulerThread.joinable()) {
            schedulerThread.join();
        }
        Logger::info("ScraperService", "Job scheduler stopped.");
    }
}

void ScraperService::jobSchedulerLoop() {
    Logger::info("ScraperService", "Job scheduler loop started.");
    while (schedulerRunning) {
        // Process jobs from the queue first (on-demand execution)
        std::pair<std::string, std::string> jobToProcess;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            if (jobQueue.empty()) {
                // Wait for a new job or for a scheduled check (e.g., every minute)
                cv.wait_for(lock, std::chrono::minutes(1), [this] { return !jobQueue.empty() || !schedulerRunning; });
            }
            if (!schedulerRunning) break; // Exit if asked to stop

            if (!jobQueue.empty()) {
                jobToProcess = jobQueue.front();
                jobQueue.pop();
                lock.unlock(); // Release lock for job processing
                processJob(jobToProcess.first, jobToProcess.second);
                continue; // Process next queued job
            }
        } // queueMutex lock goes out of scope

        // After checking queue, find and execute scheduled jobs
        if (!schedulerRunning) break;

        // In a real system, you would query for jobs that are active and past their last_run_at + run_interval_seconds
        // For simplicity, let's just assume we check all active jobs periodically.
        // This requires `jobRepo` to have a method to get *all* active jobs, or active jobs for an admin.
        // For now, this part is illustrative. A production system would have a more complex scheduling query.

        // Example: Get all jobs (need to modify JobRepository to allow admin to get all jobs or iterate through users)
        // This part needs refinement to query for _active_ jobs due for a run across all users.
        // For now, let's simulate by iterating over all jobs for a dummy "admin" user if possible or by a specific scheduler user.
        // A more realistic approach would be to query DB for `is_active = true AND last_run_at + run_interval_seconds < NOW()`.

        // This loop simulates looking for jobs to run based on interval
        // For a full implementation, this needs to query all active jobs from the DB.
        // As JobRepository is tied to userId, this would need an admin context or a dedicated scheduler repo method.
        // Let's assume a simplified check for illustration:
        Logger::debug("ScraperService", "Checking for scheduled jobs...");
        // A full implementation would query: SELECT * FROM scraping_jobs WHERE is_active = true AND (last_run_at + INTERVAL '1 second' * run_interval_seconds) < NOW();
        // Since JobRepository methods require userId, this would need a design change or a special "scheduler" user ID.
        // For now, this part will remain conceptual. The `executeJobNow` demonstrates the actual scraping.
        std::this_thread::sleep_for(std::chrono::seconds(10)); // Simulate work/wait before re-checking for scheduled tasks
    }
    Logger::info("ScraperService", "Job scheduler loop finished.");
}

void ScraperService::processJob(const std::string& jobId, const std::string& userId) {
    Logger::info("ScraperService", "Processing job {} for user {}", jobId, userId);
    try {
        // Update job status to running
        auto job = jobRepo->findJobById(jobId, userId);
        if (!job) {
            Logger::error("ScraperService", "Job {} not found for processing.", jobId);
            return;
        }
        job->status = "running";
        jobRepo->updateJob(*job);

        // Perform scraping
        std::vector<ScrapedResult> results = scrapeTargetsForJob(jobId, userId);
        Logger::info("ScraperService", "Job {} completed. Scraped {} results.", jobId, results.size());

        // Update job status to completed
        job->status = "completed";
        job->lastRunAt = std::chrono::system_clock::now();
        jobRepo->updateJob(*job);

    } catch (const AppException& e) {
        Logger::error("ScraperService", "Error processing job {}: {}", jobId, e.what());
        auto job = jobRepo->findJobById(jobId, userId);
        if (job) {
            job->status = "failed";
            jobRepo->updateJob(*job);
        }
    } catch (const std::exception& e) {
        Logger::critical("ScraperService", "Critical error processing job {}: {}", jobId, e.what());
        auto job = jobRepo->findJobById(jobId, userId);
        if (job) {
            job->status = "failed";
            jobRepo->updateJob(*job);
        }
    }
}

std::vector<ScrapedResult> ScraperService::scrapeTargetsForJob(const std::string& jobId, const std::string& userId) {
    std::vector<ScrapedResult> allResults;
    std::vector<ScrapingTarget> targets = jobRepo->findTargetsByJobId(jobId, userId);

    if (targets.empty()) {
        Logger::warn("ScraperService", "No targets found for job {}", jobId);
        return allResults;
    }

    for (const auto& target : targets) {
        Logger::info("ScraperService", "Scraping target: {} (Job ID: {})", target.url, jobId);
        try {
            // Execute scraping
            nlohmann::json scrapedData = scraperCore->scrape(target);
            if (!scrapedData.empty()) {
                ScrapedResult result;
                result.jobId = jobId;
                result.targetId = target.id;
                result.data = scrapedData.dump();
                result.createdAt = std::chrono::system_clock::now();

                auto createdResult = jobRepo->createResult(result);
                if (createdResult) {
                    allResults.push_back(*createdResult);
                    Logger::debug("ScraperService", "Successfully scraped data for target {}. Results stored.", target.id);
                } else {
                    Logger::error("ScraperService", "Failed to store scraped data for target {}", target.id);
                }
            } else {
                Logger::warn("ScraperService", "No data scraped for target {}.", target.id);
            }
        } catch (const AppException& e) {
            Logger::error("ScraperService", "Failed to scrape target {}: {}", target.id, e.what());
        } catch (const std::exception& e) {
            Logger::error("ScraperService", "Unexpected error during scraping target {}: {}", target.id, e.what());
        }
    }
    return allResults;
}

std::future<std::vector<ScrapedResult>> ScraperService::executeJobNow(const std::string& jobId, const std::string& userId) {
    if (!jobRepo || !scraperCore) {
        throw ServiceUnavailableException("Scraper service not initialized.");
    }

    // Submit job to a thread pool or run directly. For simplicity, queue and let scheduler pick it.
    // A more advanced system would use a dedicated thread pool for immediate jobs.
    {
        std::lock_guard<std::mutex> lock(queueMutex);
        jobQueue.push({jobId, userId});
        Logger::info("ScraperService", "Job {} for user {} added to immediate execution queue.", jobId, userId);
    }
    cv.notify_one(); // Notify scheduler thread

    // For demonstration, this doesn't actually return the *future* results of this specific job execution
    // because it's being handled asynchronously by the scheduler. A real system would need a map
    // of job_id to std::promise to fulfill the future.
    // For now, we'll return a dummy future that resolves to an empty vector after a short delay,
    // and rely on clients checking the results via API.
    // A full implementation would involve a more complex async task management.
    return std::async(std::launch::async, [this, jobId, userId]() {
        // This lambda runs in a separate thread to simulate eventual results.
        // In a proper future-based system, `processJob` would directly resolve a promise.
        // For this example, we'll just indicate it's queued.
        std::this_thread::sleep_for(std::chrono::milliseconds(500)); // Simulate async queueing
        Logger::info("ScraperService", "Job {} has been queued for immediate execution.", jobId);
        return std::vector<ScrapedResult>(); // Actual results would be fetched via API after processing
    });
}
```