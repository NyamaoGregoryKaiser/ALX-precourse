```cpp
#ifndef WEBSCRAPER_JOB_SERVICE_H
#define WEBSCRAPER_JOB_SERVICE_H

#include "../database/job_repository.h"
#include "../models/scraping_job.h"
#include "../models/scraping_target.h"
#include "../models/scraped_result.h"
#include "../common/error_handler.h"
#include "../cache/cache_manager.h"
#include <string>
#include <vector>
#include <optional>

class JobService {
public:
    JobService(JobRepository& jobRepo);

    // Scraping Job operations
    ScrapingJob createScrapingJob(const std::string& userId, const std::string& name, const std::string& description,
                                  int runIntervalSeconds, bool isActive);
    std::optional<ScrapingJob> getScrapingJobById(const std::string& jobId, const std::string& userId);
    std::vector<ScrapingJob> getAllScrapingJobs(const std::string& userId);
    ScrapingJob updateScrapingJob(const std::string& jobId, const std::string& userId,
                                  const std::string& name, const std::string& description,
                                  int runIntervalSeconds, bool isActive, const std::string& status);
    void deleteScrapingJob(const std::string& jobId, const std::string& userId);

    // Scraping Target operations
    ScrapingTarget createScrapingTarget(const std::string& jobId, const std::string& userId, const std::string& url,
                                        const std::string& method, const std::string& payload,
                                        const std::map<std::string, std::string>& headers,
                                        const std::map<std::string, std::string>& selectors);
    std::optional<ScrapingTarget> getScrapingTargetById(const std::string& targetId, const std::string& jobId, const std::string& userId);
    std::vector<ScrapingTarget> getScrapingTargetsByJobId(const std::string& jobId, const std::string& userId);
    ScrapingTarget updateScrapingTarget(const std::string& targetId, const std::string& jobId, const std::string& userId,
                                        const std::string& url, const std::string& method, const std::string& payload,
                                        const std::map<std::string, std::string>& headers,
                                        const std::map<std::string, std::string>& selectors);
    void deleteScrapingTarget(const std::string& targetId, const std::string& jobId, const std::string& userId);

    // Scraped Result operations
    std::vector<ScrapedResult> getScrapedResultsByTargetId(const std::string& targetId, const std::string& userId, int limit, int offset);
    std::vector<ScrapedResult> getScrapedResultsByJobId(const std::string& jobId, const std::string& userId, int limit, int offset);

private:
    JobRepository& jobRepo;
    LRUCache<std::string, nlohmann::json>& apiCache; // Reference to the API response cache
};

#endif // WEBSCRAPER_JOB_SERVICE_H
```