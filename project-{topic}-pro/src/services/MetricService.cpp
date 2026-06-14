```cpp
#include "MetricService.h"
#include "../utils/Logger.h"
#include "../utils/TimeUtil.h"
#include "../utils/Cache.h" // For caching available metrics

// Simple in-memory cache for available metric names
Cache<std::string, std::vector<std::string>> availableMetricsCache;

MetricService::MetricService(MetricRepository& metricRepository)
    : metricRepository(metricRepository) {
        // Initialize cache for available metrics
        availableMetricsCache.set_ttl(AppConfig::getCacheTtlSeconds());
    }

void MetricService::ingestMetrics(const std::vector<MetricData>& metrics) {
    if (metrics.empty()) {
        return;
    }
    metricRepository.saveMetrics(metrics);
    // Invalidate cache for available metrics if new metric names are introduced
    for (const auto& metric : metrics) {
        if (!availableMetricsCache.contains(metric.metric_name)) { // Simplified check
            availableMetricsCache.invalidate_all(); // Invalidate for simplicity
            break;
        }
    }
}

std::vector<MetricData> MetricService::getMetricData(const std::string& metric_name, long long start_timestamp, long long end_timestamp, int limit) {
    if (start_timestamp == 0 && end_timestamp == 0) {
        // Default to last hour if no range specified
        end_timestamp = TimeUtil::getCurrentTimestampMs();
        start_timestamp = end_timestamp - (3600 * 1000); // 1 hour ago
    }
    return metricRepository.getMetricData(metric_name, start_timestamp, end_timestamp, limit);
}

std::vector<AggregatedMetricData> MetricService::getAggregatedMetricData(
    const std::string& metric_name,
    long long start_timestamp,
    long long end_timestamp,
    const std::string& interval,
    const std::string& aggregation_type)
{
    if (start_timestamp == 0 && end_timestamp == 0) {
        end_timestamp = TimeUtil::getCurrentTimestampMs();
        start_timestamp = end_timestamp - (24 * 3600 * 1000); // Default to last 24 hours for aggregation
    }
    return metricRepository.getAggregatedMetricData(metric_name, start_timestamp, end_timestamp, interval, aggregation_type);
}

std::vector<std::string> MetricService::getAvailableMetrics() {
    // Try to get from cache first
    auto cached_metrics = availableMetricsCache.get("all_metrics");
    if (cached_metrics.has_value()) {
        Logger::debug("Available metrics retrieved from cache.");
        return cached_metrics.value();
    }

    // If not in cache, fetch from DB and store in cache
    std::vector<std::string> metrics = metricRepository.getAvailableMetrics();
    availableMetricsCache.set("all_metrics", metrics);
    Logger::debug("Available metrics fetched from DB and cached.");
    return metrics;
}
```