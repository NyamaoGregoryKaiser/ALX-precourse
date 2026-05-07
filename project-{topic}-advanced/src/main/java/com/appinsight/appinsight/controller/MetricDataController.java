package com.appinsight.appinsight.controller;

import com.appinsight.appinsight.dto.MetricDataRequest;
import com.appinsight.appinsight.service.MetricDataService;
import com.bucket4j.RateLimit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/metric-data")
@RequiredArgsConstructor
@Slf4j
public class MetricDataController {

    private final MetricDataService metricDataService;

    // Endpoint for external applications to ingest data
    @PostMapping("/ingest")
    @ResponseStatus(HttpStatus.ACCEPTED) // Data ingestion is often async/accepted
    // Rate limiting via application.yml config
    public ResponseEntity<String> ingestMetricData(
            @RequestHeader(name = "X-API-KEY") @NotNull String apiKey,
            @Valid @RequestBody List<MetricDataRequest> dataRequests) {
        log.info("Received ingestion request for {} data points from API key: {}", dataRequests.size(), apiKey);
        metricDataService.ingestMetricData(apiKey, dataRequests);
        return ResponseEntity.accepted().body("Metric data ingestion accepted.");
    }

    // Endpoint for users to query historical data
    @GetMapping("/{metricId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<MetricDataRequest>> getMetricData(
            @PathVariable Long metricId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @NotNull LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @NotNull LocalDateTime endTime) {
        log.info("Received request to get metric data for metric ID: {} from {} to {}", metricId, startTime, endTime);
        List<MetricDataRequest> data = metricDataService.getMetricData(metricId, startTime, endTime);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/{metricId}/paginated")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<MetricDataRequest>> getMetricDataPaginated(
            @PathVariable Long metricId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "100") @Min(1) int size) {
        log.info("Received request for paginated metric data for metric ID: {} (page: {}, size: {})", metricId, page, size);
        Page<MetricDataRequest> dataPage = metricDataService.getMetricDataPaginated(metricId, page, size);
        return ResponseEntity.ok(dataPage);
    }
}