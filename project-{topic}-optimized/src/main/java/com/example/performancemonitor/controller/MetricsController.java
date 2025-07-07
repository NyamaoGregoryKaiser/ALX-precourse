```java
package com.example.performancemonitor.controller;


import com.example.performancemonitor.model.SystemMetrics;
import com.example.performancemonitor.repository.MetricsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/metrics")
public class MetricsController {

    @Autowired
    private MetricsRepository metricsRepository;

    @GetMapping
    public Iterable<SystemMetrics> getAllMetrics() {
        return metricsRepository.findAll();
    }

    @PostMapping
    public SystemMetrics addMetrics() {
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        SystemMetrics metrics = new SystemMetrics();
        metrics.setCpuUsage(osBean.getSystemCpuLoad()); //Simplified - needs better implementation
        metrics.setMemoryUsage(Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
        metrics.setTimestamp(LocalDateTime.now());
        return metricsRepository.save(metrics);
    }
}
```