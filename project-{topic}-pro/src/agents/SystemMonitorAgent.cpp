```cpp
#include "SystemMonitorAgent.h"
#include "../utils/Logger.h"
#include "../utils/TimeUtil.h"
#include <chrono>

SystemMonitorAgent::SystemMonitorAgent(MetricService& metricService, int interval_seconds)
    : metricService(metricService), interval_seconds(interval_seconds), running(false) {}

SystemMonitorAgent::~SystemMonitorAgent() {
    stop();
}

void SystemMonitorAgent::start() {
    if (running.exchange(true)) {
        Logger::warn("SystemMonitorAgent is already running.");
        return;
    }
    Logger::info("SystemMonitorAgent starting with interval {} seconds.", interval_seconds);
    agent_thread = std::thread(&SystemMonitorAgent::collectAndSendMetrics, this);
}

void SystemMonitorAgent::stop() {
    if (running.exchange(false)) {
        Logger::info("SystemMonitorAgent stopping...");
        if (agent_thread.joinable()) {
            agent_thread.join();
        }
        Logger::info("SystemMonitorAgent stopped.");
    }
}

double SystemMonitorAgent::getRandomValue(double min, double max) {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(min, max);
    return dis(gen);
}

void SystemMonitorAgent::collectAndSendMetrics() {
    while (running) {
        std::vector<MetricData> collected_metrics;
        long long current_timestamp = TimeUtil::getCurrentTimestampMs();

        // Simulate collecting CPU usage (0-100%)
        collected_metrics.emplace_back("system.cpu.usage", getRandomValue(5.0, 70.0), current_timestamp);

        // Simulate collecting Memory usage (GB)
        collected_metrics.emplace_back("system.memory.used_gb", getRandomValue(2.0, 16.0), current_timestamp);

        // Simulate collecting Disk usage (%)
        collected_metrics.emplace_back("system.disk.usage", getRandomValue(20.0, 95.0), current_timestamp);

        // Simulate collecting Network I/O (MB/s)
        collected_metrics.emplace_back("system.network.in_mbps", getRandomValue(0.1, 10.0), current_timestamp);
        collected_metrics.emplace_back("system.network.out_mbps", getRandomValue(0.1, 10.0), current_timestamp);

        // Simulate a custom application metric (e.g., API response time in ms)
        collected_metrics.emplace_back("app.api.response_time_ms", getRandomValue(10.0, 500.0), current_timestamp);
        collected_metrics.emplace_back("app.api.error_count", getRandomValue(0.0, 5.0), current_timestamp);


        try {
            metricService.ingestMetrics(collected_metrics);
            Logger::debug("Agent collected and sent {} system metrics.", collected_metrics.size());
        } catch (const std::exception& e) {
            Logger::error("Agent failed to ingest metrics: {}", e.what());
        }

        std::this_thread::sleep_for(std::chrono::seconds(interval_seconds));
    }
}
```