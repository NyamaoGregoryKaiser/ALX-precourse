```cpp
#ifndef WEBSCRAPER_SCRAPER_SERVICE_H
#define WEBSCRAPER_SCRAPER_SERVICE_H

#include "../database/job_repository.h"
#include "../scraper/scraper_core.h"
#include "../models/scraping_job.h"
#include "../models/scraping_target.h"
#include "../models/scraped_result.h"
#include "../common/logger.h"
#include "../common/config.h"
#include <string>
#include <vector>
#include <future>
#include <thread>
#include <queue>
#include <mutex>
#include <condition_variable>

class ScraperService {
public:
    static ScraperService& getInstance();
    ScraperService(const ScraperService&) = delete;
    ScraperService& operator=(const ScraperService&) = delete;
    ~ScraperService();

    void initialize(JobRepository& jobRepo, ScraperCore& scraperCore);
    void startJobScheduler();
    void stopJobScheduler();
    std::future<std::vector<ScrapedResult>> executeJobNow(const std::string& jobId, const std::string& userId);

private:
    ScraperService(); // Private constructor for singleton

    JobRepository* jobRepo;
    ScraperCore* scraperCore;

    std::atomic<bool> schedulerRunning;
    std::thread schedulerThread;
    std::mutex queueMutex;
    std::condition_variable cv;
    std::queue<std::pair<std::string, std::string>> jobQueue; // <jobId, userId>

    void jobSchedulerLoop();
    void processJob(const std::string& jobId, const std::string& userId);
    std::vector<ScrapedResult> scrapeTargetsForJob(const std::string& jobId, const std::string& userId);
};

#endif // WEBSCRAPER_SCRAPER_SERVICE_H
```