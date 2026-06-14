```cpp
#include "MetricsController.h"
#include "../utils/Logger.h"
#include "../utils/StringUtil.h"
#include <nlohmann/json.hpp>

MetricsController::MetricsController(MetricService& metricService)
    : metricService(metricService) {}

crow::response MetricsController::ingestMetrics(const crow::request& req) {
    try {
        nlohmann::json data = nlohmann::json::parse(req.body);
        if (!data.is_array()) {
            Logger::warn("Ingest metrics: Request body is not a JSON array.");
            return crow::response(400, "Request body must be a JSON array of metrics.");
        }

        std::vector<MetricData> metrics_to_ingest;
        for (const auto& item : data) {
            if (!item.contains("metric_name") || !item.contains("value") || !item.contains("timestamp")) {
                Logger::warn("Ingest metrics: Malformed metric data in array: {}", item.dump());
                return crow::response(400, "Each metric must contain 'metric_name', 'value', and 'timestamp'.");
            }
            metrics_to_ingest.emplace_back(
                item["metric_name"].get<std::string>(),
                item["value"].get<double>(),
                item["timestamp"].get<long long>()
            );
        }

        metricService.ingestMetrics(metrics_to_ingest);
        Logger::info("Successfully ingested {} metrics.", metrics_to_ingest.size());
        return crow::response(200, "Metrics ingested successfully.");

    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("Ingest metrics: JSON parse error: {}", e.what());
        return crow::response(400, "Invalid JSON in request body.");
    } catch (const std::exception& e) {
        Logger::error("Ingest metrics: An unexpected error occurred: {}", e.what());
        return crow::response(500, "Internal Server Error: " + std::string(e.what()));
    }
}

crow::response MetricsController::getMetricData(const crow::request& req, const std::string& metric_name) {
    try {
        long long start_timestamp = StringUtil::toLong(req.url_params.get("start"), 0);
        long long end_timestamp = StringUtil::toLong(req.url_params.get("end"), 0);
        int limit = StringUtil::toInt(req.url_params.get("limit"), 100);

        std::vector<MetricData> data = metricService.getMetricData(metric_name, start_timestamp, end_timestamp, limit);

        nlohmann::json response_json = nlohmann::json::array();
        for (const auto& md : data) {
            response_json.push_back({
                {"metric_name", md.metric_name},
                {"value", md.value},
                {"timestamp", md.timestamp}
            });
        }
        return crow::response(200, response_json.dump());

    } catch (const std::exception& e) {
        Logger::error("Get metric data for {}: An unexpected error occurred: {}", metric_name, e.what());
        return crow::response(500, "Internal Server Error: " + std::string(e.what()));
    }
}

crow::response MetricsController::getAggregatedMetricData(const crow::request& req, const std::string& metric_name) {
    try {
        long long start_timestamp = StringUtil::toLong(req.url_params.get("start"), 0);
        long long end_timestamp = StringUtil::toLong(req.url_params.get("end"), 0);
        std::string interval = req.url_params.get("interval") ? req.url_params.get("interval") : "1m"; // e.g., 1m, 5m, 1h
        std::string aggregation_type = req.url_params.get("type") ? req.url_params.get("type") : "avg"; // e.g., avg, min, max, sum, count

        std::vector<AggregatedMetricData> data = metricService.getAggregatedMetricData(
            metric_name, start_timestamp, end_timestamp, interval, aggregation_type
        );

        nlohmann::json response_json = nlohmann::json::array();
        for (const auto& amd : data) {
            response_json.push_back({
                {"timestamp", amd.timestamp},
                {"value", amd.value}
            });
        }
        return crow::response(200, response_json.dump());

    } catch (const std::exception& e) {
        Logger::error("Get aggregated metric data for {}: An unexpected error occurred: {}", metric_name, e.what());
        return crow::response(500, "Internal Server Error: " + std::string(e.what()));
    }
}

crow::response MetricsController::getAvailableMetrics(const crow::request& req) {
    try {
        std::vector<std::string> available_metrics = metricService.getAvailableMetrics();
        nlohmann::json response_json = available_metrics; // nlohmann/json can convert vector<string> to JSON array
        return crow::response(200, response_json.dump());
    } catch (const std::exception& e) {
        Logger::error("Get available metrics: An unexpected error occurred: {}", e.what());
        return crow::response(500, "Internal Server Error: " + std::string(e.what()));
    }
}
```