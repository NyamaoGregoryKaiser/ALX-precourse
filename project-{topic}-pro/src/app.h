```cpp
#ifndef WEBSCRAPER_APP_H
#define WEBSCRAPER_APP_H

#include <pistache/endpoint.h>
#include <pistache/router.h>
#include "database/db_manager.h"
#include "database/user_repository.h"
#include "database/job_repository.h"
#include "services/user_service.h"
#include "services/job_service.h"
#include "services/scraper_service.h"
#include "scraper/scraper_core.h"
#include "controllers/auth_controller.h"
#include "controllers/jobs_controller.h"
#include "common/config.h"
#include "common/logger.h"
#include "cache/cache_manager.h"

class WebScraperApp {
public:
    WebScraperApp();
    ~WebScraperApp();

    void run();
    void shutdown();

private:
    std::shared_ptr<Pistache::Http::Endpoint> httpEndpoint;
    Pistache::Rest::Router router;

    // Repositories
    UserRepository userRepository;
    JobRepository jobRepository;

    // Services
    UserService userService;
    JobService jobService;
    ScraperCore scraperCore; // Initialize scraper core
    ScraperService& scraperService = ScraperService::getInstance(); // Singleton

    // Controllers
    AuthController authController;
    JobsController jobsController;

    void setupRoutes();
    void setupGlobalErrorHandling();
};

#endif // WEBSCRAPER_APP_H
```