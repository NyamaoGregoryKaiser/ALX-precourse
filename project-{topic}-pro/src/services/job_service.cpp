```cpp
#include "job_service.h"

JobService::JobService(JobRepository& jobRepo)
    : jobRepo(jobRepo), apiCache(CacheManager::getInstance().getApiResponseCache()) {}

// --- Scraping Job Operations ---
ScrapingJob JobService::createScrapingJob(const std::string& userId, const std::string& name, const std::string& description,
                                          int runIntervalSeconds, bool isActive) {
    if (name.empty()) {
        throw BadRequestException("Job name cannot be empty.");
    }
    if (runIntervalSeconds < 0) {
        throw BadRequestException("Run interval cannot be negative.");
    }

    ScrapingJob newJob;
    newJob.userId = userId;
    newJob.name = name;
    newJob.description = description;
    newJob.status = "pending";
    newJob.runIntervalSeconds = runIntervalSeconds;
    newJob.isActive = isActive;
    newJob.lastRunAt = std::chrono::system_clock::time_point{}; // Epoch time as default

    auto createdJob = jobRepo.createJob(newJob);
    if (!createdJob) {
        throw DatabaseException("Failed to create scraping job.");
    }
    Logger::info("JobService", "Job created: {} by user {}", createdJob->name, userId);
    return *createdJob;
}

std::optional<ScrapingJob> JobService::getScrapingJobById(const std::string& jobId, const std::string& userId) {
    std::string cacheKey = "job_" + jobId + "_" + userId;
    auto cachedJson = apiCache.get(cacheKey);
    if (cachedJson) {
        Logger::debug("JobService", "Returning job {} from cache for user {}", jobId, userId);
        // Assuming there's a way to convert nlohmann::json back to ScrapingJob
        // This is a simplification; ideally, models should have fromJson methods or similar.
        ScrapingJob job;
        job.id = cachedJson->at("id").get<std::string>();
        job.userId = cachedJson->at("userId").get<std::string>();
        job.name = cachedJson->at("name").get<std::string>();
        // ... populate other fields ...
        return jobRepo.findJobById(jobId, userId); // For now, actually fetch and ignore cached, just demonstrate cache usage
    }

    auto job = jobRepo.findJobById(jobId, userId);
    if (job) {
        apiCache.put(cacheKey, job->toJson());
        Logger::debug("JobService", "Caching job {} for user {}", jobId, userId);
    }
    return job;
}

std::vector<ScrapingJob> JobService::getAllScrapingJobs(const std::string& userId) {
    return jobRepo.findAllJobs(userId);
}

ScrapingJob JobService::updateScrapingJob(const std::string& jobId, const std::string& userId,
                                          const std::string& name, const std::string& description,
                                          int runIntervalSeconds, bool isActive, const std::string& status) {
    auto existingJob = jobRepo.findJobById(jobId, userId);
    if (!existingJob) {
        throw NotFoundException("Scraping job");
    }

    existingJob->name = name;
    existingJob->description = description;
    existingJob->runIntervalSeconds = runIntervalSeconds;
    existingJob->isActive = isActive;
    existingJob->status = status; // Status might be updated by scraper too

    if (!jobRepo.updateJob(*existingJob)) {
        throw DatabaseException("Failed to update scraping job.");
    }
    apiCache.remove("job_" + jobId + "_" + userId); // Invalidate cache
    Logger::info("JobService", "Job updated: {} by user {}", jobId, userId);
    return *existingJob;
}

void JobService::deleteScrapingJob(const std::string& jobId, const std::string& userId) {
    if (!jobRepo.deleteJob(jobId, userId)) {
        throw NotFoundException("Scraping job or insufficient permissions");
    }
    apiCache.remove("job_" + jobId + "_" + userId); // Invalidate cache
    Logger::info("JobService", "Job deleted: {} by user {}", jobId, userId);
}

// --- Scraping Target Operations ---
ScrapingTarget JobService::createScrapingTarget(const std::string& jobId, const std::string& userId, const std::string& url,
                                                const std::string& method, const std::string& payload,
                                                const std::map<std::string, std::string>& headers,
                                                const std::map<std::string, std::string>& selectors) {
    if (url.empty() || method.empty()) {
        throw BadRequestException("Target URL and method cannot be empty.");
    }
    // Check if the job exists and belongs to the user
    if (!jobRepo.findJobById(jobId, userId).has_value()) {
        throw NotFoundException("Scraping job");
    }

    ScrapingTarget newTarget;
    newTarget.jobId = jobId;
    newTarget.url = url;
    newTarget.method = method;
    newTarget.payload = payload;
    newTarget.headers = headers;
    newTarget.selectors = selectors;

    auto createdTarget = jobRepo.createTarget(newTarget);
    if (!createdTarget) {
        throw DatabaseException("Failed to create scraping target.");
    }
    apiCache.remove("job_" + jobId + "_" + userId); // Job details might include targets summary
    Logger::info("JobService", "Target created for job {}: {}", jobId, url);
    return *createdTarget;
}

std::optional<ScrapingTarget> JobService::getScrapingTargetById(const std::string& targetId, const std::string& jobId, const std::string& userId) {
    std::string cacheKey = "target_" + targetId + "_" + jobId + "_" + userId;
    auto cachedJson = apiCache.get(cacheKey);
    if (cachedJson) {
        Logger::debug("JobService", "Returning target {} from cache for user {}", targetId, userId);
        return jobRepo.findTargetById(targetId, jobId, userId); // For now, actually fetch and ignore cached
    }

    auto target = jobRepo.findTargetById(targetId, jobId, userId);
    if (target) {
        apiCache.put(cacheKey, target->toJson());
        Logger::debug("JobService", "Caching target {} for user {}", targetId, userId);
    }
    return target;
}

std::vector<ScrapingTarget> JobService::getScrapingTargetsByJobId(const std::string& jobId, const std::string& userId) {
    // No caching for lists for simplicity, as they change frequently
    return jobRepo.findTargetsByJobId(jobId, userId);
}

ScrapingTarget JobService::updateScrapingTarget(const std::string& targetId, const std::string& jobId, const std::string& userId,
                                                const std::string& url, const std::string& method, const std::string& payload,
                                                const std::map<std::string, std::string>& headers,
                                                const std::map<std::string, std::string>& selectors) {
    auto existingTarget = jobRepo.findTargetById(targetId, jobId, userId);
    if (!existingTarget) {
        throw NotFoundException("Scraping target");
    }

    existingTarget->url = url;
    existingTarget->method = method;
    existingTarget->payload = payload;
    existingTarget->headers = headers;
    existingTarget->selectors = selectors;

    if (!jobRepo.updateTarget(*existingTarget)) {
        throw DatabaseException("Failed to update scraping target.");
    }
    apiCache.remove("target_" + targetId + "_" + jobId + "_" + userId); // Invalidate cache
    apiCache.remove("job_" + jobId + "_" + userId); // Job details might include targets summary
    Logger::info("JobService", "Target updated: {} for job {}", targetId, jobId);
    return *existingTarget;
}

void JobService::deleteScrapingTarget(const std::string& targetId, const std::string& jobId, const std::string& userId) {
    if (!jobRepo.deleteTarget(targetId, jobId, userId)) {
        throw NotFoundException("Scraping target or insufficient permissions");
    }
    apiCache.remove("target_" + targetId + "_" + jobId + "_" + userId); // Invalidate cache
    apiCache.remove("job_" + jobId + "_" + userId); // Job details might include targets summary
    Logger::info("JobService", "Target deleted: {} for job {}", targetId, jobId);
}

// --- Scraped Result Operations ---
std::vector<ScrapedResult> JobService::getScrapedResultsByTargetId(const std::string& targetId, const std::string& userId, int limit, int offset) {
    // No caching for results as they are dynamic and can be large
    return jobRepo.findResultsByTargetId(targetId, userId, limit, offset);
}

std::vector<ScrapedResult> JobService::getScrapedResultsByJobId(const std::string& jobId, const std::string& userId, int limit, int offset) {
    // No caching for results as they are dynamic and can be large
    return jobRepo.findResultsByJobId(jobId, userId, limit, offset);
}
```