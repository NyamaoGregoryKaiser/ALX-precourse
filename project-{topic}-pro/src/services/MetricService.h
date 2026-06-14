```cpp
#ifndef AURORA_METRICS_METRICSERVICE_H
#define AURORA_METRICS_METRICSERVICE_H

#include "../repositories/MetricRepository.h"
#include "../models/MetricData.h"
#include <string>
#include <vector>
#include <memory>

// A structure to hold aggregated data
struct AggregatedMetricData {
    long long timestamp;
    double value;
};

class MetricService {
public:
    MetricService(MetricRepository& metricRepository);

    void ingestMetrics(const std::vector<MetricData>& metrics);
    std::vector<MetricData> getMetricData(const std::string& metric_name, long long start_timestamp, long long end_timestamp, int limit);
    std::vector<AggregatedMetricData> getAggregatedMetricData(const std::string& metric_name, long long start_timestamp, long long end_timestamp, const std::string& interval, const std::string& aggregation_type);
    std::vector<std::string> getAvailableMetrics();

private:
    MetricRepository& metricRepository;
};

#endif // AURORA_METRICS_METRICSERVICE_H
```