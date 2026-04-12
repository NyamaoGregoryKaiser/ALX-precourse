#pragma once

#include "services/ScrapingService.h"
#include "database/ScrapeJobRepository.h"
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <chrono>

// Cron expression parser (placeholder)
// In a real system, use a library like 'croncpp' or a simpler custom parser for specific cron formats.
namespace cron {
    // Simple mock cron parser to check if a job is due
    bool is_due(const std::string& cron_schedule, const std::chrono::system_clock::time_point& last_run_at, const std::chrono::system_clock::time_point& now);
}

class SchedulerService {
public:
    SchedulerService(ScrapingService& scraping_service, int interval_seconds = 60);
    ~SchedulerService();

    void start();
    void stop();

private:
    void run(); // The main scheduling loop function

    ScrapingService& scraping_service_;
    ScrapeJobRepository job_repo_;
    std::thread scheduler_thread_;
    std::atomic<bool> running_;
    int interval_seconds_; // How often the scheduler checks for jobs
    std::mutex mtx_;
    std::condition_variable cv_;
};