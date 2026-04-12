#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>

enum class ScrapeJobStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED
};

// Helper for string conversion of ScrapeJobStatus
inline std::string scrape_job_status_to_string(ScrapeJobStatus status) {
    switch (status) {
        case ScrapeJobStatus::PENDING: return "PENDING";
        case ScrapeJobStatus::RUNNING: return "RUNNING";
        case ScrapeJobStatus::COMPLETED: return "COMPLETED";
        case ScrapeJobStatus::FAILED: return "FAILED";
        case ScrapeJobStatus::CANCELLED: return "CANCELLED";
        default: return "UNKNOWN";
    }
}

inline std::optional<ScrapeJobStatus> string_to_scrape_job_status(const std::string& s) {
    if (s == "PENDING") return ScrapeJobStatus::PENDING;
    if (s == "RUNNING") return ScrapeJobStatus::RUNNING;
    if (s == "COMPLETED") return ScrapeJobStatus::COMPLETED;
    if (s == "FAILED") return ScrapeJobStatus::FAILED;
    if (s == "CANCELLED") return ScrapeJobStatus::CANCELLED;
    return std::nullopt;
}

struct ScrapeJob {
    int id = 0;
    int user_id = 0; // Owner of the job
    std::string name;
    std::string target_url;
    std::vector<std::pair<std::string, std::string>> selectors; // e.g., {"title", "h1.product-title"}, {"price", ".price-tag"}
    std::string cron_schedule; // CRON expression for scheduling
    ScrapeJobStatus status = ScrapeJobStatus::PENDING;
    std::optional<std::string> last_error;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;
    std::optional<std::chrono::system_clock::time_point> last_run_at;
    std::optional<std::chrono::system_clock::time_point> next_run_at;
};