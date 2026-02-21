```cpp
#ifndef METRIC_H
#define METRIC_H

#include <string>
#include <nlohmann/json.hpp>
#include <optional>

struct Metric {
    std::string id;
    std::string system_id;
    std::string metric_name;
    double metric_value;
    std::string timestamp; // ISO 8601 format

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"system_id", system_id},
            {"metric_name", metric_name},
            {"metric_value", metric_value},
            {"timestamp", timestamp}
        };
    }

    static Metric from_json(const nlohmann::json& j) {
        Metric metric;
        metric.id = j.value("id", ""); // ID might not be present for ingestion
        metric.system_id = j.at("system_id").get<std::string>();
        metric.metric_name = j.at("metric_name").get<std::string>();
        metric.metric_value = j.at("metric_value").get<double>();
        metric.timestamp = j.value("timestamp", "");
        return metric;
    }
};

// Struct for aggregated metric data
struct AggregatedMetric {
    std::string metric_name;
    std::string time_bucket; // e.g., "2023-10-27 10:00:00"
    double min_value;
    double max_value;
    double avg_value;
    int count;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"metric_name", metric_name},
            {"time_bucket", time_bucket},
            {"min_value", min_value},
            {"max_value", max_value},
            {"avg_value", avg_value},
            {"count", count}
        };
    }
};

#endif // METRIC_H
```