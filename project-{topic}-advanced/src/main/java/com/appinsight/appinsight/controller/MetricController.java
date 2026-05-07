package com.appinsight.appinsight.controller;

import com.appinsight.appinsight.dto.MetricDTO;
import com.appinsight.appinsight.service.MetricService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications/{applicationId}/metrics")
@RequiredArgsConstructor
@Slf4j
public class MetricController {

    private final MetricService metricService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<MetricDTO>> getAllMetricsForApplication(@PathVariable Long applicationId) {
        log.info("Received request to get all metrics for application ID: {}", applicationId);
        List<MetricDTO> metrics = metricService.getAllMetricsForApplication(applicationId);
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/{metricId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<MetricDTO> getMetricById(@PathVariable Long metricId) {
        log.info("Received request to get metric with ID: {}", metricId);
        MetricDTO metric = metricService.getMetricById(metricId);
        return ResponseEntity.ok(metric);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MetricDTO> createMetric(@PathVariable Long applicationId, @Valid @RequestBody MetricDTO metricDTO) {
        log.info("Received request to create metric '{}' for application ID: {}", metricDTO.getName(), applicationId);
        MetricDTO createdMetric = metricService.createMetric(applicationId, metricDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdMetric);
    }

    @PutMapping("/{metricId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MetricDTO> updateMetric(@PathVariable Long metricId, @Valid @RequestBody MetricDTO metricDTO) {
        log.info("Received request to update metric with ID: {}", metricId);
        MetricDTO updatedMetric = metricService.updateMetric(metricId, metricDTO);
        return ResponseEntity.ok(updatedMetric);
    }

    @DeleteMapping("/{metricId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMetric(@PathVariable Long metricId) {
        log.info("Received request to delete metric with ID: {}", metricId);
        metricService.deleteMetric(metricId);
        return ResponseEntity.noContent().build();
    }
}