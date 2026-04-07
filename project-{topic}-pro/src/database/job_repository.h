```cpp
#ifndef WEBSCRAPER_JOB_REPOSITORY_H
#define WEBSCRAPER_JOB_REPOSITORY_H

#include "base_repository.h"
#include "../models/scraping_job.h"
#include "../models/scraping_target.h"
#include "../models/scraped_result.h"
#include <optional>
#include <vector>

class JobRepository : public BaseRepository {
public:
    // ScrapingJob CRUD
    std::optional<ScrapingJob> createJob(const ScrapingJob& job);
    std::optional<ScrapingJob> findJobById(const std::string& id, const std::string& userId);
    std::vector<ScrapingJob> findAllJobs(const std::string& userId);
    bool updateJob(const ScrapingJob& job);
    bool deleteJob(const std::string& id, const std::string& userId);

    // ScrapingTarget CRUD (nested under job)
    std::optional<ScrapingTarget> createTarget(const ScrapingTarget& target);
    std::vector<ScrapingTarget> findTargetsByJobId(const std::string& jobId, const std::string& userId);
    std::optional<ScrapingTarget> findTargetById(const std::string& targetId, const std::string& jobId, const std::string& userId);
    bool updateTarget(const ScrapingTarget& target);
    bool deleteTarget(const std::string& targetId, const std::string& jobId, const std::string& userId);

    // ScrapedResult CRUD
    std::optional<ScrapedResult> createResult(const ScrapedResult& result);
    std::vector<ScrapedResult> findResultsByTargetId(const std::string& targetId, const std::string& userId, int limit = 100, int offset = 0);
    std::vector<ScrapedResult> findResultsByJobId(const std::string& jobId, const std::string& userId, int limit = 100, int offset = 0);
};

#endif // WEBSCRAPER_JOB_REPOSITORY_H
```