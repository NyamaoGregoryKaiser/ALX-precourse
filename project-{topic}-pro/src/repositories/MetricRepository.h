```cpp
#ifndef AURORA_METRICS_METRICREPOSITORY_H
#define AURORA_METRICS_METRICREPOSITORY_H

#include <pqxx/pqxx>
#include "../models/Metric.h"
#include "../models/MetricData.h"
#include "../services/MetricService.h" // For AggregatedMetricData
#include <string>
#include <vector>
#include <memory>

class MetricRepository {
public:
    MetricRepository(pqxx::connection& db_conn);

    void saveMetrics(const std::vector<MetricData>& metrics);
    std::vector<MetricData> getMetricData(const std::string& metric_name, long long start_timestamp, long long end_timestamp, int limit);
    std::vector<AggregatedMetricData> getAggregatedMetricData(
        const std::string& metric_name,
        long long start_timestamp,
        long long end_timestamp,
        const std::string& interval,
        const std::string& aggregation_type
    );
    std::vector<std::string> getAvailableMetrics();

private:
    pqxx::connection& db_conn;
};

#endif // AURORA_METRICS_METRICREPOSITORY_H
```