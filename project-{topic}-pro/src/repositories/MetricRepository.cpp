```cpp
#include "MetricRepository.h"
#include "../utils/Logger.h"

MetricRepository::MetricRepository(pqxx::connection& db_conn)
    : db_conn(db_conn) {}

void MetricRepository::saveMetrics(const std::vector<MetricData>& metrics) {
    pqxx::work txn(db_conn);
    try {
        for (const auto& metric : metrics) {
            txn.exec_prepared("insert_metric_data",
                metric.metric_name, metric.value, metric.timestamp);
        }
        txn.commit();
        Logger::debug("Saved {} metrics to database.", metrics.size());
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        Logger::error("SQL error saving metrics: {}", e.what());
        throw std::runtime_error("Database error saving metrics.");
    } catch (const std::exception& e) {
        txn.abort();
        Logger::error("Error saving metrics: {}", e.what());
        throw;
    }
}

std::vector<MetricData> MetricRepository::getMetricData(const std::string& metric_name, long long start_timestamp, long long end_timestamp, int limit) {
    std::vector<MetricData> data;
    pqxx::nontransaction N(db_conn);
    try {
        pqxx::result R = N.exec_prepared("get_metric_data",
                                         metric_name,
                                         start_timestamp,
                                         end_timestamp,
                                         limit);

        for (const auto& row : R) {
            data.emplace_back(
                metric_name,
                row["value"].as<double>(),
                row["timestamp"].as<long long>()
            );
        }
        Logger::debug("Fetched {} data points for metric '{}'.", data.size(), metric_name);
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting metric data for {}: {}", metric_name, e.what());
        throw std::runtime_error("Database error retrieving metric data.");
    } catch (const std::exception& e) {
        Logger::error("Error getting metric data for {}: {}", metric_name, e.what());
        throw;
    }
    return data;
}

std::vector<AggregatedMetricData> MetricRepository::getAggregatedMetricData(
    const std::string& metric_name,
    long long start_timestamp,
    long long end_timestamp,
    const std::string& interval,
    const std::string& aggregation_type
) {
    std::vector<AggregatedMetricData> data;
    pqxx::nontransaction N(db_conn);
    try {
        // Map common aggregation types to SQL functions
        std::string agg_func;
        if (aggregation_type == "avg") agg_func = "AVG";
        else if (aggregation_type == "min") agg_func = "MIN";
        else if (aggregation_type == "max") agg_func = "MAX";
        else if (aggregation_type == "sum") agg_func = "SUM";
        else if (aggregation_type == "count") agg_func = "COUNT";
        else {
            throw std::invalid_argument("Invalid aggregation type: " + aggregation_type);
        }

        // Validate interval format (simple check for now, '1m', '5m', '1h', '1d' etc.)
        // In a real system, you'd parse this more carefully, or use a specific interval unit.
        // For PostgreSQL, 'INTERVAL' type can parse many formats, but we need to ensure it's safe.
        // For simplicity, directly inject into query, but be cautious with SQL injection here.
        // Prepared statements for complex intervals or dynamic functions are harder.
        // A safer approach for dynamic agg_func/interval would be to white-list and build the query carefully.
        std::string interval_pg_format;
        // Simple mapping example, a full system would parse this more robustly.
        if (interval.back() == 'm') interval_pg_format = interval.substr(0, interval.length() - 1) + " minutes";
        else if (interval.back() == 'h') interval_pg_format = interval.substr(0, interval.length() - 1) + " hours";
        else if (interval.back() == 'd') interval_pg_format = interval.substr(0, interval.length() - 1) + " days";
        else {
             // Default to 1 hour if interval is not recognized.
            Logger::warn("Unrecognized interval format: {}. Defaulting to 1 hour.", interval);
            interval_pg_format = "1 hour";
        }

        std::string query = "SELECT " + agg_func + "(value) AS aggregated_value, "
                            "FLOOR(timestamp / (EXTRACT(EPOCH FROM INTERVAL '" + interval_pg_format + "') * 1000)) * (EXTRACT(EPOCH FROM INTERVAL '" + interval_pg_format + "') * 1000) AS interval_start_ms "
                            "FROM metric_data "
                            "WHERE metric_name = " + N.quote(metric_name) + " "
                            "AND timestamp >= " + N.quote(start_timestamp) + " "
                            "AND timestamp <= " + N.quote(end_timestamp) + " "
                            "GROUP BY interval_start_ms "
                            "ORDER BY interval_start_ms ASC;";

        pqxx::result R = N.exec(query);

        for (const auto& row : R) {
            double agg_val = 0.0;
            if (row["aggregated_value"].is_null()) {
                // If aggregation result is null (e.g., COUNT on no data)
                agg_val = 0.0; // Or appropriate default
            } else {
                agg_val = row["aggregated_value"].as<double>();
            }
            data.emplace_back(
                row["interval_start_ms"].as<long long>(),
                agg_val
            );
        }
        Logger::debug("Fetched {} aggregated data points for metric '{}' with interval '{}' and type '{}'.",
                      data.size(), metric_name, interval, aggregation_type);
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting aggregated metric data for {}: {}", metric_name, e.what());
        throw std::runtime_error("Database error retrieving aggregated metric data.");
    } catch (const std::exception& e) {
        Logger::error("Error getting aggregated metric data for {}: {}", metric_name, e.what());
        throw;
    }
    return data;
}

std::vector<std::string> MetricRepository::getAvailableMetrics() {
    std::vector<std::string> metrics;
    pqxx::nontransaction N(db_conn);
    try {
        pqxx::result R = N.exec("SELECT DISTINCT metric_name FROM metric_data ORDER BY metric_name;");
        for (const auto& row : R) {
            metrics.push_back(row[0].as<std::string>());
        }
        Logger::debug("Fetched {} available metric names.", metrics.size());
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error getting available metrics: {}", e.what());
        throw std::runtime_error("Database error retrieving available metrics.");
    } catch (const std::exception& e) {
        Logger::error("Error getting available metrics: {}", e.what());
        throw;
    }
    return metrics;
}
```