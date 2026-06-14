```cpp
#ifndef AURORA_METRICS_SYSTEMMONITORAGENT_H
#define AURORA_METRICS_SYSTEMMONITORAGENT_H

#include "../services/MetricService.h"
#include <vector>
#include <string>
#include <atomic>
#include <thread>
#include <random>

class SystemMonitorAgent {
public:
    SystemMonitorAgent(MetricService& metricService, int interval_seconds);
    ~SystemMonitorAgent();

    void start();
    void stop();

private:
    MetricService& metricService;
    int interval_seconds;
    std::atomic<bool> running;
    std::thread agent_thread;

    void collectAndSendMetrics();
    double getRandomValue(double min, double max);
};

#endif // AURORA_METRICS_SYSTEMMONITORAGENT_H
```