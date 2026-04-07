```cpp
#include "jobs_controller.h"

JobsController::JobsController(JobService& jobService, ScraperService& scraperService)
    : jobService(jobService), scraperService(scraperService) {}

void JobsController::setupRoutes(Pistache::Rest::Router& router) {
    // Add authentication middleware for all job-related routes
    auto authFilter = Pistache::Rest::Routes::withFilter(Middleware::AuthMiddleware::authenticate);
    auto rateLimitFilter = Pistache::Rest::Routes::withFilter(Middleware::RateLimitMiddleware::rateLimit);

    // Grouping routes to apply filters
    Pistache::Rest::Router::with and_auth = authFilter & rateLimitFilter;

    and_auth.post(router, "/jobs", Pistache::Rest::Routes::bind(&JobsController::createJob, this));
    and_auth.get(router, "/jobs", Pistache::Rest::Routes::bind(&JobsController::getAllJobs, this));
    and_auth.get(router, "/jobs/:id", Pistache::Rest::Routes::bind(&JobsController::getJobById, this));
    and_auth.put(router, "/jobs/:id", Pistache::Rest::Routes::bind(&JobsController::updateJob, this));
    and_auth.del(router, "/jobs/:id", Pistache::Rest::Routes::bind(&JobsController::deleteJob, this));
    and_auth.post(router, "/jobs/:id/execute", Pistache::Rest::Routes::bind(&JobsController::executeJob, this));

    and_auth.post(router, "/jobs/:jobId/targets", Pistache::Rest::Routes::bind(&JobsController::createTarget, this));
    and_auth.get(router, "/jobs/:jobId/targets", Pistache::Rest::Routes::bind(&JobsController::getTargetsByJobId, this));
    and_auth.get(router, "/jobs/:jobId/targets/:targetId", Pistache::Rest::Routes::bind(&JobsController::getTargetById, this));
    and_auth.put(router, "/jobs/:jobId/targets/:targetId", Pistache::Rest::Routes::bind(&JobsController::updateTarget, this));
    and_auth.del(router, "/jobs/:jobId/targets/:targetId", Pistache::Rest::Routes::bind(&JobsController::deleteTarget, this));

    and_auth.get(router, "/jobs/:jobId/results", Pistache::Rest::Routes::bind(&JobsController::getResultsByJobId, this));
    and_auth.get(router, "/jobs/:jobId/targets/:targetId/results", Pistache::Rest::Routes::bind(&JobsController::getResultsByTargetId, this));
    
    Logger::info("JobsController", "Jobs, Targets, and Results routes setup with Auth and Rate Limit middleware.");
}

void JobsController::handleExceptions(const std::exception& e, Pistache::Http::ResponseWriter response) {
    try {
        throw; // Re-throw to catch specific custom exceptions
    } catch (const AppException& app_e) {
        response.send(app_e.getStatusCode(), app_e.toJson().dump());
        Logger::warn("JobsController", "API Exception: {}", app_e.what());
    } catch (const nlohmann::json::exception& json_e) {
        response.send(Http::Code::Bad_Request, BadRequestException("Invalid JSON payload or missing fields: " + std::string(json_e.what())).toJson().dump());
        Logger::warn("JobsController", "JSON Parsing Error: {}", json_e.what());
    } catch (const std::exception& generic_e) {
        response.send(Http::Code::Internal_Server_Error, AppException("An unexpected error occurred: " + std::string(generic_e.what())).toJson().dump());
        Logger::error("JobsController", "Unhandled Exception: {}", generic_e.what());
    }
}

// --- Job Endpoints ---
void JobsController::createJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string name = body.at("name").get<std::string>();
        std::string description = body.value("description", "");
        int runIntervalSeconds = body.value("runIntervalSeconds", 0);
        bool isActive = body.value("isActive", true);

        ScrapingJob job = jobService.createScrapingJob(userId, name, description, runIntervalSeconds, isActive);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Created, job.toJson().dump());
        Logger::info("JobsController", "Created job '{}' for user {}", job.name, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::getJobById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":id").as<std::string>();

        auto job = jobService.getScrapingJobById(jobId, userId);
        if (!job) {
            throw NotFoundException("Scraping job");
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, job->toJson().dump());
        Logger::info("JobsController", "Retrieved job '{}' for user {}", jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::getAllJobs(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::vector<ScrapingJob> jobs = jobService.getAllScrapingJobs(userId);

        nlohmann::json jobs_json = nlohmann::json::array();
        for (const auto& job : jobs) {
            jobs_json.push_back(job.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, jobs_json.dump());
        Logger::info("JobsController", "Retrieved all jobs for user {}", userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::updateJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":id").as<std::string>();
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string name = body.at("name").get<std::string>();
        std::string description = body.value("description", "");
        int runIntervalSeconds = body.value("runIntervalSeconds", 0);
        bool isActive = body.value("isActive", true);
        std::string status = body.value("status", "pending"); // Allow status update

        ScrapingJob updatedJob = jobService.updateScrapingJob(jobId, userId, name, description, runIntervalSeconds, isActive, status);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, updatedJob.toJson().dump());
        Logger::info("JobsController", "Updated job '{}' for user {}", jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::deleteJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":id").as<std::string>();

        jobService.deleteScrapingJob(jobId, userId);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::No_Content); // 204 No Content for successful deletion
        Logger::info("JobsController", "Deleted job '{}' for user {}", jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::executeJob(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":id").as<std::string>();

        // Asynchronously execute the job
        scraperService.executeJobNow(jobId, userId);

        nlohmann::json response_json;
        response_json["message"] = "Scraping job queued for immediate execution.";
        response_json["jobId"] = jobId;

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Accepted, response_json.dump()); // 202 Accepted, processing asynchronously
        Logger::info("JobsController", "Job '{}' execution requested by user {}. Queued.", jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

// --- Target Endpoints ---
void JobsController::createTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string url = body.at("url").get<std::string>();
        std::string method = body.value("method", "GET");
        std::string payload = body.value("payload", "");
        std::map<std::string, std::string> headers = body.value("headers", std::map<std::string, std::string>());
        std::map<std::string, std::string> selectors = body.at("selectors").get<std::map<std::string, std::string>>();

        ScrapingTarget target = jobService.createScrapingTarget(jobId, userId, url, method, payload, headers, selectors);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Created, target.toJson().dump());
        Logger::info("JobsController", "Created target '{}' for job {} by user {}", url, jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::getTargetById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();
        std::string targetId = request.param(":targetId").as<std::string>();

        auto target = jobService.getScrapingTargetById(targetId, jobId, userId);
        if (!target) {
            throw NotFoundException("Scraping target");
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, target->toJson().dump());
        Logger::info("JobsController", "Retrieved target '{}' for job {} by user {}", targetId, jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::getTargetsByJobId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();

        std::vector<ScrapingTarget> targets = jobService.getScrapingTargetsByJobId(jobId, userId);

        nlohmann::json targets_json = nlohmann::json::array();
        for (const auto& target : targets) {
            targets_json.push_back(target.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, targets_json.dump());
        Logger::info("JobsController", "Retrieved all targets for job {} by user {}", jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::updateTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();
        std::string targetId = request.param(":targetId").as<std::string>();
        nlohmann::json body = nlohmann::json::parse(request.body());

        std::string url = body.at("url").get<std::string>();
        std::string method = body.value("method", "GET");
        std::string payload = body.value("payload", "");
        std::map<std::string, std::string> headers = body.value("headers", std::map<std::string, std::string>());
        std::map<std::string, std::string> selectors = body.at("selectors").get<std::map<std::string, std::string>>();

        ScrapingTarget updatedTarget = jobService.updateScrapingTarget(targetId, jobId, userId, url, method, payload, headers, selectors);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, updatedTarget.toJson().dump());
        Logger::info("JobsController", "Updated target '{}' for job {} by user {}", targetId, jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::deleteTarget(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();
        std::string targetId = request.param(":targetId").as<std::string>();

        jobService.deleteScrapingTarget(targetId, jobId, userId);

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::No_Content);
        Logger::info("JobsController", "Deleted target '{}' for job {} by user {}", targetId, jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

// --- Result Endpoints ---
void JobsController::getResultsByTargetId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>(); // Not strictly needed, but good for context/validation
        std::string targetId = request.param(":targetId").as<std::string>();

        int limit = request.query().has("limit") ? request.query().get("limit").as<int>() : 100;
        int offset = request.query().has("offset") ? request.query().get("offset").as<int>() : 0;

        std::vector<ScrapedResult> results = jobService.getScrapedResultsByTargetId(targetId, userId, limit, offset);

        nlohmann::json results_json = nlohmann::json::array();
        for (const auto& result : results) {
            results_json.push_back(result.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, results_json.dump());
        Logger::info("JobsController", "Retrieved {} results for target {} (job {}) by user {}", results.size(), targetId, jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}

void JobsController::getResultsByJobId(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
    try {
        std::string userId = Middleware::AuthMiddleware::getUserId(request);
        std::string jobId = request.param(":jobId").as<std::string>();

        int limit = request.query().has("limit") ? request.query().get("limit").as<int>() : 100;
        int offset = request.query().has("offset") ? request.query().get("offset").as<int>() : 0;

        std::vector<ScrapedResult> results = jobService.getScrapedResultsByJobId(jobId, userId, limit, offset);

        nlohmann::json results_json = nlohmann::json::array();
        for (const auto& result : results) {
            results_json.push_back(result.toJson());
        }

        response.headers().add<Pistache::Http::Header::ContentType>(Pistache::Http::Mime::Application_Json);
        response.send(Http::Code::Ok, results_json.dump());
        Logger::info("JobsController", "Retrieved {} results for job {} by user {}", results.size(), jobId, userId);
    } catch (const std::exception& e) {
        handleExceptions(e, response);
    }
}
```