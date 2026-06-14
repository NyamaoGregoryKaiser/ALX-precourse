```cpp
#ifndef AURORA_METRICS_METRICDATA_H
#define AURORA_METRICS_METRICDATA_H

#include <string>

struct MetricData {
    std::string metric_name;
    double value;
    long long timestamp; // Unix timestamp in milliseconds

    MetricData(const std::string& name, double val, long long ts)
        : metric_name(name), value(val), timestamp(ts) {}
};

#endif // AURORA_METRICS_METRICDATA_H
```