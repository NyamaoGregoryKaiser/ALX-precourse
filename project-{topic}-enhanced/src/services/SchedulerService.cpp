#include "SchedulerService.h"
#include "utils/Logger.h"

// Mock Cron Parser Implementation (VERY simplified)
namespace cron {
    bool is_due(const std::string& cron_schedule, const std::chrono::system_clock::time_point& last_run_at, const std::chrono::system_clock::time_point& now) {
        // This is a minimal, illustrative implementation.
        // A real cron parser would parse the cron_schedule string (e.g., "0 0 * * *")
        // and calculate the next due time.
        // For simplicity, we'll just say if it's been more than X minutes/hours since last run.
        if (cron_schedule.empty() || cron_schedule == "manual") {
            return false; // Not scheduled via cron
        }

        // Example: "every_10_minutes"
        if (cron_schedule == "every_10_minutes") {
            if (last_run_at == std::chrono::system_clock::time_point{}) { // Never run before
                return true;
            }
            auto diff = std::chrono::duration_cast<std::chrono::minutes>(now - last_run_at).count();
            return diff >= 10;
        }
        // Add more cron logic here.
        // For now, let's just make any non-empty non-manual schedule trigger every 5 minutes if never run,
        // or every 5 minutes after the last run.
        if (last_run_at == std::chrono::system_clock::time_point{}) {
            return true;
        }
        auto diff = std::chrono::duration_cast<std::chrono::minutes>(now - last_run_at).count();
        return diff >= 5; // Default to every 5 minutes for any valid cron string
    }
} // namespace cron

SchedulerService::SchedulerService(ScrapingService& scraping_service, int interval_seconds)
    : scraping_service_(scraping_service),
      running_(false),
      interval_seconds_(interval_seconds) {
}

SchedulerService::~SchedulerService() {
    stop();
}

void SchedulerService::start() {
    if (running_.load()) {
        LOG_WARN("Scheduler already running.");
        return;
    }
    running_.store(true);
    scheduler_thread_ = std::thread(&SchedulerService::run, this);
    LOG_INFO("SchedulerService started with an interval of {} seconds.", interval_seconds_);
}

void SchedulerService::stop() {
    if (!running_.load()) {
        return;
    }
    running_.store(false);
    cv_.notify_one(); // Wake up the thread if it's waiting
    if (scheduler_thread_.joinable()) {
        scheduler_thread_.join();
    }
    LOG_INFO("SchedulerService stopped.");
}

void SchedulerService::run() {
    while (running_.load()) {
        LOG_DEBUG("Scheduler checking for due jobs...");
        std::vector<ScrapeJob> all_jobs = job_repo_.get_all_active_jobs(); // Assumes this method exists and returns all jobs

        for (const auto& job : all_jobs) {
            if (job.status == ScrapeJobStatus::PENDING || job.status == ScrapeJobStatus::COMPLETED || job.status == ScrapeJobStatus::FAILED) {
                // Only consider jobs that are not currently running or cancelled
                std::chrono::system_clock::time_point last_run = job.last_run_at.value_or(std::chrono::system_clock::time_point{});
                if (cron::is_due(job.cron_schedule, last_run, std::chrono::system_clock::now())) {
                    LOG_INFO("Job '{}' (ID: {}) is due. Triggering scrape.", job.name, job.id);
                    // Trigger scrape asynchronously to avoid blocking the scheduler loop
                    scraping_service_.trigger_scrape(job);
                }
            }
        }

        // Wait for the next interval or until notified to stop
        std::unique_lock<std::mutex> lock(mtx_);
        cv_.wait_for(lock, std::chrono::seconds(interval_seconds_), [this] { return !running_.load(); });
    }
}