```cpp
#ifndef WEBSCRAPER_JOBS_CONTROLLER_H
#define WEBSCRAPER_JOBS_CONTROLLER_H

#include <pistache/router.h>
#include <pistache/http.h>
#include <nlohmann/json.hpp>
#include "../services/job_service.h"
#include "../services/scraper_service.h"
#include "../middleware/auth_middleware.h"
#include "../common/error_handler.h"
#include "../common/logger.h"
#include "../cache/cache_manager.h"

class JobsController {
public:
    JobsController(JobService& jobService, ScraperService& scraperService);

    void setupRoutes(Pistache::Rest::Router& router);

private:
    JobService& jobService;
    ScraperService& scraperService;

    // --- Job Endpoints ---
    void createJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void getJobById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void getAllJobs(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void updateJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void deleteJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void executeJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

    // --- Target Endpoints ---
    void createTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void getTargetById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void getTargetsByJobId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void updateTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void deleteTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

    // --- Result Endpoints ---
    void getResultsByTargetId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void getResultsByJobId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

    void handleExceptions(const std::exception& e, Pistache::Http::ResponseWriter response);
};

#endif // WEBSCRAPER_JOBS_CONTROLLER_H
```