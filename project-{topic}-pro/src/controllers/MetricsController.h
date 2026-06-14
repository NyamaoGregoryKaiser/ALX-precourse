```cpp
#ifndef AURORA_METRICS_METRICSCONTROLLER_H
#define AURORA_METRICS_METRICSCONTROLLER_H

#include "crow.h"
#include "../services/MetricService.h"
#include "../models/MetricData.h"
#include <string>
#include <vector>

class MetricsController {
public:
    MetricsController(MetricService& metricService);

    crow::response ingestMetrics(const crow::request& req);
    crow::response getMetricData(const crow::request& req, const std::string& metric_name);
    crow::response getAggregatedMetricData(const crow::request& req, const std::string& metric_name);
    crow::response getAvailableMetrics(const crow::request& req);

private:
    MetricService& metricService;
};

#endif // AURORA_METRICS_METRICSCONTROLLER_H
```