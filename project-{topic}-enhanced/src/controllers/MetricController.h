```cpp
#ifndef METRICCONTROLLER_H
#define METRICCONTROLLER_H

#include <crow.h>
#include <string>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <memory>

#include "../services/MetricService.h"
#include "../services/SystemService.h" // For API key validation
#include "../services/AlertService.h" // For alert checking
#include "../database/DbConnection.h"
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/JsonUtils.h"
#include "../middleware/AuthMiddleware.h" // For AuthContext (if user-authenticated endpoints)
#include "../services/RateLimiter.h" // For rate limiting on ingestion

class MetricController {
public:
    MetricController(std::function<std::shared_ptr<pqxx::connection>()> get_conn_func)
        : get_conn_from_pool(std::move(get_conn_func)) {}

    // Ingest a new metric (authenticated via API Key, not JWT)
    crow::response ingestMetric(const crow::request& req, const std::string& system_id) {
        // Rate limiting for ingestion endpoint
        std::string client_ip = req.get_header("X-Forwarded-For") ? req.get_header("X-Forwarded-For") : req.remote_ip_address();
        if (RateLimiter::is_rate_limited(client_ip)) {
            LOG_WARN("Rate limit exceeded for IP {} on ingestMetric.", client_ip);
            throw ApiException(crow::TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
        }

        // API Key authentication for metric ingestion
        const char* api_key_header = req.get_header("X-API-Key");
        if (!api_key_header) {
            throw ApiException(crow::UNAUTHORIZED, "Missing X-API-Key header for metric ingestion.");
        }
        std::string api_key = api_key_header;

        auto conn = get_conn_from_pool();
        SystemService systemService(conn);
        std::optional<System> system = systemService.get_system_by_api_key(api_key);
        // Release connection early if system service doesn't need it anymore.
        // Or keep it for MetricService if they share the same transaction (not here).
        DbConnection::release_connection(conn);

        if (!system || system->id != system_id) {
            LOG_WARN("Unauthorized metric ingestion attempt: Invalid API Key or system ID mismatch for API key starting with {}", api_key.substr(0, 8));
            throw ApiException(crow::FORBIDDEN, "Invalid API Key or system ID.");
        }

        try {
            nlohmann::json request_body = nlohmann::json::parse(req.body);

            std::string metric_name = JsonUtils::get_required<std::string>(request_body, "metric_name");
            double metric_value = JsonUtils::get_required<double>(request_body, "metric_value");
            
            // Get a fresh connection for MetricService
            auto conn_metric = get_conn_from_pool();
            MetricService metricService(conn_metric);
            Metric metric = metricService.ingest_metric(system_id, metric_name, metric_value);
            DbConnection::release_connection(conn_metric);

            // After ingesting, check for alerts for this system and metric
            // This could be moved to a background worker for production
            auto conn_alert = get_conn_from_pool();
            AlertService alertService(conn_alert);
            std::vector<AlertHistory> triggered_alerts = alertService.check_and_trigger_alerts(system_id, metric_name, metric_value);
            DbConnection::release_connection(conn_alert);

            nlohmann::json response_json = metric.to_json();
            if (!triggered_alerts.empty()) {
                nlohmann::json triggered_alerts_json = nlohmann::json::array();
                for (const auto& alert_history : triggered_alerts) {
                    triggered_alerts_json.push_back(alert_history.to_json());
                }
                response_json["triggered_alerts"] = triggered_alerts_json;
            }

            return crow::response(crow::CREATED, response_json.dump());

        } catch (const nlohmann::json::exception& e) {
            LOG_WARN("JSON parse error in ingestMetric for system {}: {}", system_id, e.what());
            throw ApiException(crow::BAD_REQUEST, "Invalid JSON format or missing fields.");
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in ingestMetric for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during metric ingestion.");
        }
    }

    // Get raw metrics for a system (authenticated via JWT)
    crow::response getMetrics(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        // Verify user owns the system
        auto conn_system = get_conn_from_pool();
        SystemService systemService(conn_system);
        std::optional<System> system_check = systemService.get_system(user_id, system_id);
        DbConnection::release_connection(conn_system);

        if (!system_check) {
            throw ApiException(crow::NOT_FOUND, "System not found or not owned by user.");
        }

        try {
            std::optional<std::string> metric_name_filter = req.url_params.get("metric_name");
            std::optional<std::string> start_time = req.url_params.get("start_time");
            std::optional<std::string> end_time = req.url_params.get("end_time");
            int limit = 100; // Default limit
            if (req.url_params.get("limit")) {
                limit = std::stoi(std::string(req.url_params.get("limit")));
            }

            auto conn = get_conn_from_pool();
            MetricService metricService(conn);
            std::vector<Metric> metrics = metricService.get_metrics(system_id, metric_name_filter, start_time, end_time, limit);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& metric : metrics) {
                response_json.push_back(metric.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const std::invalid_argument& e) {
            throw ApiException(crow::BAD_REQUEST, "Invalid limit parameter: " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getMetrics for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get latest metrics for a system
    crow::response getLatestMetrics(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        // Verify user owns the system
        auto conn_system = get_conn_from_pool();
        SystemService systemService(conn_system);
        std::optional<System> system_check = systemService.get_system(user_id, system_id);
        DbConnection::release_connection(conn_system);

        if (!system_check) {
            throw ApiException(crow::NOT_FOUND, "System not found or not owned by user.");
        }

        try {
            int limit_per_metric = 1; // Default to 1 latest per metric
            if (req.url_params.get("limit_per_metric")) {
                limit_per_metric = std::stoi(std::string(req.url_params.get("limit_per_metric")));
            }

            auto conn = get_conn_from_pool();
            MetricService metricService(conn);
            std::vector<Metric> metrics = metricService.get_latest_metrics(system_id, limit_per_metric);
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& metric : metrics) {
                response_json.push_back(metric.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const std::invalid_argument& e) {
            throw ApiException(crow::BAD_REQUEST, "Invalid limit_per_metric parameter: " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::runtime_error& e) {
            LOG_ERROR("Runtime error in getLatestMetrics for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


    // Get aggregated metrics for a system (authenticated via JWT)
    crow::response getAggregatedMetrics(const crow::request& req, const std::string& system_id) {
        auto& ctx = req.template get_context<AuthMiddleware>();
        std::string user_id = ctx.auth_context.user_id;

        // Verify user owns the system
        auto conn_system = get_conn_from_pool();
        SystemService systemService(conn_system);
        std::optional<System> system_check = systemService.get_system(user_id, system_id);
        DbConnection::release_connection(conn_system);

        if (!system_check) {
            throw ApiException(crow::NOT_FOUND, "System not found or not owned by user.");
        }

        try {
            std::string metric_name_filter = JsonUtils::get_string(req.url_params, "metric_name");
            std::string start_time = JsonUtils::get_string(req.url_params, "start_time");
            std::string end_time = JsonUtils::get_string(req.url_params, "end_time");
            std::string time_bucket_interval = JsonUtils::get_string(req.url_params, "interval", "1 hour"); // Default to 1 hour

            auto conn = get_conn_from_pool();
            MetricService metricService(conn);
            std::vector<AggregatedMetric> aggregated_metrics = metricService.get_aggregated_metrics(
                system_id, metric_name_filter, start_time, end_time, time_bucket_interval
            );
            DbConnection::release_connection(conn);

            nlohmann::json response_json = nlohmann::json::array();
            for (const auto& agg_metric : aggregated_metrics) {
                response_json.push_back(agg_metric.to_json());
            }
            return crow::response(crow::OK, response_json.dump());

        } catch (const std::runtime_error& e) { // Catches errors from JsonUtils::get_string
            LOG_WARN("Missing or invalid query parameter in getAggregatedMetrics: {}", e.what());
            throw ApiException(crow::BAD_REQUEST, "Missing required query parameters (metric_name, start_time, end_time, interval). " + std::string(e.what()));
        } catch (const ApiException& e) {
            throw e;
        } catch (const std::exception& e) {
            LOG_ERROR("Runtime error in getAggregatedMetrics for user {} system {}: {}", user_id, system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


private:
    std::function<std::shared_ptr<pqxx::connection>()> get_conn_from_pool;
};

#endif // METRICCONTROLLER_H
```