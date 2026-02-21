```cpp
#ifndef METRICSERVICE_H
#define METRICSERVICE_H

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>
#include <optional>
#include <chrono>

#include "../models/Metric.h"
#include "../utils/Logger.h"
#include "../exceptions/ApiException.h"
#include "../utils/Crypto.h"

class MetricService {
public:
    MetricService(std::shared_ptr<pqxx::connection> conn) : db_conn(std::move(conn)) {}

    // Ingest a new metric for a system
    Metric ingest_metric(const std::string& system_id, const std::string& metric_name, double metric_value) {
        if (metric_name.empty()) {
            throw ApiException(crow::BAD_REQUEST, "Metric name cannot be empty.");
        }

        std::string metric_id = Crypto::generate_uuid();

        try {
            pqxx::work w(*db_conn);
            pqxx::result r = w.exec_params(
                "INSERT INTO metrics (id, system_id, metric_name, metric_value) VALUES ($1, $2, $3, $4) RETURNING id, system_id, metric_name, metric_value, timestamp",
                metric_id, system_id, metric_name, metric_value
            );
            w.commit();

            if (r.empty()) {
                throw ApiException(crow::INTERNAL_SERVER_ERROR, "Failed to ingest metric, no data returned.");
            }

            Metric metric;
            metric.id = r[0]["id"].as<std::string>();
            metric.system_id = r[0]["system_id"].as<std::string>();
            metric.metric_name = r[0]["metric_name"].as<std::string>();
            metric.metric_value = r[0]["metric_value"].as<double>();
            metric.timestamp = r[0]["timestamp"].as<std::string>();

            LOG_DEBUG("Metric ingested: {}={} for system {}", metric.metric_name, metric.metric_value, system_id);
            return metric;

        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error ingesting metric for system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error ingesting metric.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error ingesting metric for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred during metric ingestion.");
        }
    }

    // Get raw metrics for a system within a time range
    std::vector<Metric> get_metrics(const std::string& system_id,
                                    const std::optional<std::string>& metric_name_filter,
                                    const std::optional<std::string>& start_time,
                                    const std::optional<std::string>& end_time,
                                    int limit) {
        std::vector<Metric> metrics;
        std::string query = "SELECT id, system_id, metric_name, metric_value, timestamp FROM metrics WHERE system_id = $1";
        std::vector<pqxx::param_type> params;
        params.push_back(system_id);
        int param_idx = 2;

        if (metric_name_filter) {
            query += " AND metric_name = $" + std::to_string(param_idx++);
            params.push_back(*metric_name_filter);
        }
        if (start_time) {
            query += " AND timestamp >= $" + std::to_string(param_idx++);
            params.push_back(*start_time);
        }
        if (end_time) {
            query += " AND timestamp <= $" + std::to_string(param_idx++);
            params.push_back(*end_time);
        }

        query += " ORDER BY timestamp DESC LIMIT $" + std::to_string(param_idx++);
        params.push_back(limit);

        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(query, params);

            for (const auto& row : r) {
                Metric metric;
                metric.id = row["id"].as<std::string>();
                metric.system_id = row["system_id"].as<std::string>();
                metric.metric_name = row["metric_name"].as<std::string>();
                metric.metric_value = row["metric_value"].as<double>();
                metric.timestamp = row["timestamp"].as<std::string>();
                metrics.push_back(metric);
            }
            LOG_DEBUG("Retrieved {} metrics for system {}.", metrics.size(), system_id);
            return metrics;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error retrieving metrics for system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error retrieving metrics.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error retrieving metrics for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }

    // Get the latest metrics for a system
    std::vector<Metric> get_latest_metrics(const std::string& system_id, int limit_per_metric) {
        std::vector<Metric> latest_metrics;
        std::string query = R"(
            WITH RankedMetrics AS (
                SELECT
                    id,
                    system_id,
                    metric_name,
                    metric_value,
                    timestamp,
                    ROW_NUMBER() OVER (PARTITION BY metric_name ORDER BY timestamp DESC) as rn
                FROM metrics
                WHERE system_id = $1
            )
            SELECT
                id, system_id, metric_name, metric_value, timestamp
            FROM RankedMetrics
            WHERE rn <= $2
            ORDER BY metric_name, timestamp DESC;
        )";
        
        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(query, system_id, limit_per_metric);

            for (const auto& row : r) {
                Metric metric;
                metric.id = row["id"].as<std::string>();
                metric.system_id = row["system_id"].as<std::string>();
                metric.metric_name = row["metric_name"].as<std::string>();
                metric.metric_value = row["metric_value"].as<double>();
                metric.timestamp = row["timestamp"].as<std::string>();
                latest_metrics.push_back(metric);
            }
            LOG_DEBUG("Retrieved {} latest metrics for system {}.", latest_metrics.size(), system_id);
            return latest_metrics;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error retrieving latest metrics for system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error retrieving latest metrics.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error retrieving latest metrics for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


    // Get aggregated metrics for a system within a time range and time bucket
    std::vector<AggregatedMetric> get_aggregated_metrics(const std::string& system_id,
                                                         const std::string& metric_name_filter,
                                                         const std::string& start_time,
                                                         const std::string& end_time,
                                                         const std::string& time_bucket_interval) { // e.g., '1 hour', '1 day'
        std::vector<AggregatedMetric> aggregated_metrics;
        std::string query = R"(
            SELECT
                metric_name,
                time_bucket($5::INTERVAL, timestamp) AS time_bucket,
                MIN(metric_value) AS min_value,
                MAX(metric_value) AS max_value,
                AVG(metric_value) AS avg_value,
                COUNT(metric_value) AS count
            FROM metrics
            WHERE system_id = $1
              AND metric_name = $2
              AND timestamp >= $3
              AND timestamp <= $4
            GROUP BY metric_name, time_bucket($5::INTERVAL, timestamp)
            ORDER BY time_bucket;
        )";

        try {
            pqxx::nontransaction n(*db_conn);
            pqxx::result r = n.exec_params(
                query, system_id, metric_name_filter, start_time, end_time, time_bucket_interval
            );

            for (const auto& row : r) {
                AggregatedMetric agg_metric;
                agg_metric.metric_name = row["metric_name"].as<std::string>();
                agg_metric.time_bucket = row["time_bucket"].as<std::string>();
                agg_metric.min_value = row["min_value"].as<double>();
                agg_metric.max_value = row["max_value"].as<double>();
                agg_metric.avg_value = row["avg_value"].as<double>();
                agg_metric.count = row["count"].as<int>();
                aggregated_metrics.push_back(agg_metric);
            }
            LOG_DEBUG("Retrieved {} aggregated metrics for system {} and metric {}.", aggregated_metrics.size(), system_id, metric_name_filter);
            return aggregated_metrics;
        } catch (const pqxx::sql_error& e) {
            LOG_ERROR("SQL Error retrieving aggregated metrics for system {}: {}. Query: {}", system_id, e.what(), e.query());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "Database error retrieving aggregated metrics.");
        } catch (const std::exception& e) {
            LOG_ERROR("Error retrieving aggregated metrics for system {}: {}", system_id, e.what());
            throw ApiException(crow::INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
        }
    }


private:
    std::shared_ptr<pqxx::connection> db_conn;
};

#endif // METRICSERVICE_H
```