```cpp
#include "job_repository.h"
#include <nlohmann/json.hpp>

// Helper to convert map to JSON string
std::string mapToJsonString(const std::map<std::string, std::string>& m) {
    nlohmann::json j = m;
    return j.dump();
}

// Helper to convert JSON string to map
std::map<std::string, std::string> jsonStringToMap(const std::string& json_str) {
    if (json_str.empty()) return {};
    try {
        nlohmann::json j = nlohmann::json::parse(json_str);
        return j.get<std::map<std::string, std::string>>();
    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("JobRepository", "Failed to parse JSON string to map: {}. Error: {}", json_str, e.what());
        return {};
    }
}

// --- ScrapingJob CRUD ---
std::optional<ScrapingJob> JobRepository::createJob(const ScrapingJob& job) {
    return executeTransaction([&](pqxx::work& W) -> std::optional<ScrapingJob> {
        std::string new_id = generateUuid();
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);

        std::string query = R"(
            INSERT INTO scraping_jobs
            (id, user_id, name, description, status, created_at, updated_at, last_run_at, run_interval_seconds, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, user_id, name, description, status, created_at, updated_at, last_run_at, run_interval_seconds, is_active;
        )";
        pqxx::result R = W.exec_params(query,
                                       new_id, job.userId, job.name, job.description, job.status,
                                       now_str, now_str, toPgTimestamp(job.lastRunAt), job.runIntervalSeconds, job.isActive);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            ScrapingJob createdJob;
            createdJob.id = row["id"].as<std::string>();
            createdJob.userId = row["user_id"].as<std::string>();
            createdJob.name = row["name"].as<std::string>();
            createdJob.description = row["description"].as<std::string>();
            createdJob.status = row["status"].as<std::string>();
            createdJob.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            createdJob.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            createdJob.lastRunAt = fromPgTimestamp(row["last_run_at"].as<std::string>());
            createdJob.runIntervalSeconds = row["run_interval_seconds"].as<int>();
            createdJob.isActive = row["is_active"].as<bool>();
            return createdJob;
        }
        return std::nullopt;
    });
}

std::optional<ScrapingJob> JobRepository::findJobById(const std::string& id, const std::string& userId) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::optional<ScrapingJob> {
        std::string query = R"(
            SELECT id, user_id, name, description, status, created_at, updated_at, last_run_at, run_interval_seconds, is_active
            FROM scraping_jobs
            WHERE id = $1 AND user_id = $2;
        )";
        pqxx::result R = N.exec_params(query, id, userId);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            ScrapingJob job;
            job.id = row["id"].as<std::string>();
            job.userId = row["user_id"].as<std::string>();
            job.name = row["name"].as<std::string>();
            job.description = row["description"].as<std::string>();
            job.status = row["status"].as<std::string>();
            job.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            job.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            job.lastRunAt = fromPgTimestamp(row["last_run_at"].as<std::string>());
            job.runIntervalSeconds = row["run_interval_seconds"].as<int>();
            job.isActive = row["is_active"].as<bool>();
            return job;
        }
        return std::nullopt;
    });
}

std::vector<ScrapingJob> JobRepository::findAllJobs(const std::string& userId) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::vector<ScrapingJob> {
        std::vector<ScrapingJob> jobs;
        std::string query = R"(
            SELECT id, user_id, name, description, status, created_at, updated_at, last_run_at, run_interval_seconds, is_active
            FROM scraping_jobs
            WHERE user_id = $1
            ORDER BY created_at DESC;
        )";
        pqxx::result R = N.exec_params(query, userId);

        for (const auto& row : R) {
            ScrapingJob job;
            job.id = row["id"].as<std::string>();
            job.userId = row["user_id"].as<std::string>();
            job.name = row["name"].as<std::string>();
            job.description = row["description"].as<std::string>();
            job.status = row["status"].as<std::string>();
            job.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            job.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            job.lastRunAt = fromPgTimestamp(row["last_run_at"].as<std::string>());
            job.runIntervalSeconds = row["run_interval_seconds"].as<int>();
            job.isActive = row["is_active"].as<bool>();
            jobs.push_back(job);
        }
        return jobs;
    });
}

bool JobRepository::updateJob(const ScrapingJob& job) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);
        std::string query = R"(
            UPDATE scraping_jobs
            SET name = $1, description = $2, status = $3, updated_at = $4,
                last_run_at = $5, run_interval_seconds = $6, is_active = $7
            WHERE id = $8 AND user_id = $9;
        )";
        pqxx::result R = W.exec_params(query,
                                       job.name, job.description, job.status, now_str,
                                       toPgTimestamp(job.lastRunAt), job.runIntervalSeconds, job.isActive,
                                       job.id, job.userId);
        return R.affected_rows() == 1;
    });
}

bool JobRepository::deleteJob(const std::string& id, const std::string& userId) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        // Cascading delete is set up in schema, so targets and results will be deleted automatically
        std::string query = "DELETE FROM scraping_jobs WHERE id = $1 AND user_id = $2;";
        pqxx::result R = W.exec_params(query, id, userId);
        return R.affected_rows() == 1;
    });
}

// --- ScrapingTarget CRUD ---
std::optional<ScrapingTarget> JobRepository::createTarget(const ScrapingTarget& target) {
    return executeTransaction([&](pqxx::work& W) -> std::optional<ScrapingTarget> {
        std::string new_id = generateUuid();
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);

        std::string query = R"(
            INSERT INTO scraping_targets
            (id, job_id, url, method, payload, headers, selectors, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, job_id, url, method, payload, headers, selectors, created_at, updated_at;
        )";
        pqxx::result R = W.exec_params(query,
                                       new_id, target.jobId, target.url, target.method, target.payload,
                                       mapToJsonString(target.headers), mapToJsonString(target.selectors),
                                       now_str, now_str);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            ScrapingTarget createdTarget;
            createdTarget.id = row["id"].as<std::string>();
            createdTarget.jobId = row["job_id"].as<std::string>();
            createdTarget.url = row["url"].as<std::string>();
            createdTarget.method = row["method"].as<std::string>();
            createdTarget.payload = row["payload"].as<std::string>();
            createdTarget.headers = jsonStringToMap(row["headers"].as<std::string>());
            createdTarget.selectors = jsonStringToMap(row["selectors"].as<std::string>());
            createdTarget.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            createdTarget.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            return createdTarget;
        }
        return std::nullopt;
    });
}

std::vector<ScrapingTarget> JobRepository::findTargetsByJobId(const std::string& jobId, const std::string& userId) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::vector<ScrapingTarget> {
        std::vector<ScrapingTarget> targets;
        // Ensure the job belongs to the user
        std::string query = R"(
            SELECT st.id, st.job_id, st.url, st.method, st.payload, st.headers, st.selectors, st.created_at, st.updated_at
            FROM scraping_targets st
            JOIN scraping_jobs sj ON st.job_id = sj.id
            WHERE st.job_id = $1 AND sj.user_id = $2
            ORDER BY st.created_at;
        )";
        pqxx::result R = N.exec_params(query, jobId, userId);

        for (const auto& row : R) {
            ScrapingTarget target;
            target.id = row["id"].as<std::string>();
            target.jobId = row["job_id"].as<std::string>();
            target.url = row["url"].as<std::string>();
            target.method = row["method"].as<std::string>();
            target.payload = row["payload"].as<std::string>();
            target.headers = jsonStringToMap(row["headers"].as<std::string>());
            target.selectors = jsonStringToMap(row["selectors"].as<std::string>());
            target.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            target.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            targets.push_back(target);
        }
        return targets;
    });
}

std::optional<ScrapingTarget> JobRepository::findTargetById(const std::string& targetId, const std::string& jobId, const std::string& userId) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::optional<ScrapingTarget> {
        // Ensure the job belongs to the user
        std::string query = R"(
            SELECT st.id, st.job_id, st.url, st.method, st.payload, st.headers, st.selectors, st.created_at, st.updated_at
            FROM scraping_targets st
            JOIN scraping_jobs sj ON st.job_id = sj.id
            WHERE st.id = $1 AND st.job_id = $2 AND sj.user_id = $3;
        )";
        pqxx::result R = N.exec_params(query, targetId, jobId, userId);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            ScrapingTarget target;
            target.id = row["id"].as<std::string>();
            target.jobId = row["job_id"].as<std::string>();
            target.url = row["url"].as<std::string>();
            target.method = row["method"].as<std::string>();
            target.payload = row["payload"].as<std::string>();
            target.headers = jsonStringToMap(row["headers"].as<std::string>());
            target.selectors = jsonStringToMap(row["selectors"].as<std::string>());
            target.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            target.updatedAt = fromPgTimestamp(row["updated_at"].as<std::string>());
            return target;
        }
        return std::nullopt;
    });
}

bool JobRepository::updateTarget(const ScrapingTarget& target) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);
        std::string query = R"(
            UPDATE scraping_targets
            SET url = $1, method = $2, payload = $3, headers = $4, selectors = $5, updated_at = $6
            WHERE id = $7 AND job_id = $8;
        )"; // userId check is implicitly done by checking the job_id
        pqxx::result R = W.exec_params(query,
                                       target.url, target.method, target.payload,
                                       mapToJsonString(target.headers), mapToJsonString(target.selectors),
                                       now_str, target.id, target.jobId);
        return R.affected_rows() == 1;
    });
}

bool JobRepository::deleteTarget(const std::string& targetId, const std::string& jobId, const std::string& userId) {
    return executeTransaction([&](pqxx::work& W) -> bool {
        // Ensure the job belongs to the user before deleting target
        std::string check_query = "SELECT 1 FROM scraping_jobs WHERE id = $1 AND user_id = $2;";
        pqxx::result check_R = W.exec_params(check_query, jobId, userId);
        if (check_R.empty()) {
            Logger::warn("JobRepository", "Attempted to delete target {} from job {} owned by another user {}.", targetId, jobId, userId);
            return false; // Job does not belong to user
        }

        std::string query = "DELETE FROM scraping_targets WHERE id = $1 AND job_id = $2;";
        pqxx::result R = W.exec_params(query, targetId, jobId);
        return R.affected_rows() == 1;
    });
}

// --- ScrapedResult CRUD ---
std::optional<ScrapedResult> JobRepository::createResult(const ScrapedResult& result) {
    return executeTransaction([&](pqxx::work& W) -> std::optional<ScrapedResult> {
        std::string new_id = generateUuid();
        auto now = std::chrono::system_clock::now();
        std::string now_str = toPgTimestamp(now);

        std::string query = R"(
            INSERT INTO scraped_results
            (id, job_id, target_id, data, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, job_id, target_id, data, created_at;
        )";
        pqxx::result R = W.exec_params(query,
                                       new_id, result.jobId, result.targetId, result.data, now_str);

        if (!R.empty()) {
            const pqxx::row& row = R[0];
            ScrapedResult createdResult;
            createdResult.id = row["id"].as<std::string>();
            createdResult.jobId = row["job_id"].as<std::string>();
            createdResult.targetId = row["target_id"].as<std::string>();
            createdResult.data = row["data"].as<std::string>();
            createdResult.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            return createdResult;
        }
        return std::nullopt;
    });
}

std::vector<ScrapedResult> JobRepository::findResultsByTargetId(const std::string& targetId, const std::string& userId, int limit, int offset) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::vector<ScrapedResult> {
        std::vector<ScrapedResult> results;
        // Join with jobs table to ensure user ownership
        std::string query = R"(
            SELECT sr.id, sr.job_id, sr.target_id, sr.data, sr.created_at
            FROM scraped_results sr
            JOIN scraping_targets st ON sr.target_id = st.id
            JOIN scraping_jobs sj ON st.job_id = sj.id
            WHERE sr.target_id = $1 AND sj.user_id = $2
            ORDER BY sr.created_at DESC
            LIMIT $3 OFFSET $4;
        )";
        pqxx::result R = N.exec_params(query, targetId, userId, limit, offset);

        for (const auto& row : R) {
            ScrapedResult result;
            result.id = row["id"].as<std::string>();
            result.jobId = row["job_id"].as<std::string>();
            result.targetId = row["target_id"].as<std::string>();
            result.data = row["data"].as<std::string>();
            result.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            results.push_back(result);
        }
        return results;
    });
}

std::vector<ScrapedResult> JobRepository::findResultsByJobId(const std::string& jobId, const std::string& userId, int limit, int offset) {
    return executeNontransaction([&](pqxx::nontransaction& N) -> std::vector<ScrapedResult> {
        std::vector<ScrapedResult> results;
        // Join with jobs table to ensure user ownership
        std::string query = R"(
            SELECT sr.id, sr.job_id, sr.target_id, sr.data, sr.created_at
            FROM scraped_results sr
            JOIN scraping_jobs sj ON sr.job_id = sj.id
            WHERE sr.job_id = $1 AND sj.user_id = $2
            ORDER BY sr.created_at DESC
            LIMIT $3 OFFSET $4;
        )";
        pqxx::result R = N.exec_params(query, jobId, userId, limit, offset);

        for (const auto& row : R) {
            ScrapedResult result;
            result.id = row["id"].as<std::string>();
            result.jobId = row["job_id"].as<std::string>();
            result.targetId = row["target_id"].as<std::string>();
            result.data = row["data"].as<std::string>();
            result.createdAt = fromPgTimestamp(row["created_at"].as<std::string>());
            results.push_back(result);
        }
        return results;
    });
}
```