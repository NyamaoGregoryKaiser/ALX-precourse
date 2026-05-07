package com.appinsight.appinsight.service;

import com.appinsight.appinsight.dto.MetricDataRequest;
import com.appinsight.appinsight.model.Metric;
import com.appinsight.appinsight.model.MetricData;
import com.appinsight.appinsight.model.MonitoredApplication;
import com.appinsight.appinsight.repository.MetricDataRepository;
import com.appinsight.appinsight.repository.MetricRepository;
import com.appinsight.appinsight.repository.MonitoredApplicationRepository;
import com.appinsight.appinsight.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricDataService {

    private final MetricDataRepository metricDataRepository;
    private final MetricRepository metricRepository;
    private final MonitoredApplicationRepository applicationRepository; // For apiKey validation

    @Transactional
    public void ingestMetricData(String apiKey, List<MetricDataRequest> dataRequests) {
        log.debug("Attempting to ingest {} metric data points for API key.", dataRequests.size());

        MonitoredApplication application = applicationRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found for provided API key."));

        for (MetricDataRequest request : dataRequests) {
            Metric metric = metricRepository.findByNameAndApplication(request.getMetricName(), application)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            String.format("Metric '%s' not found for application '%s'.", request.getMetricName(), application.getName())
                    ));

            MetricData metricData = MetricData.builder()
                    .metric(metric)
                    .value(request.getValue())
                    .timestamp(request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now())
                    .tags(request.getTags())
                    .build();
            metricDataRepository.save(metricData);
            log.trace("Ingested data for metric '{}' with value {}", request.getMetricName(), request.getValue());
        }
        log.info("Successfully ingested {} metric data points for application '{}'.", dataRequests.size(), application.getName());
    }

    @Transactional(readOnly = true)
    public List<MetricDataRequest> getMetricData(Long metricId, LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Fetching metric data for metric ID: {} from {} to {}", metricId, startTime, endTime);
        Metric metric = metricRepository.findById(metricId)
                .orElseThrow(() -> new ResourceNotFoundException("Metric not found with id: " + metricId));

        return metricDataRepository.findByMetricAndTimestampBetweenOrderByTimestampAsc(metric, startTime, endTime)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MetricDataRequest> getMetricDataPaginated(Long metricId, int page, int size) {
        log.debug("Fetching paginated metric data for metric ID: {} (page: {}, size: {})", metricId, page, size);
        Metric metric = metricRepository.findById(metricId)
                .orElseThrow(() -> new ResourceNotFoundException("Metric not found with id: " + metricId));

        Pageable pageable = PageRequest.of(page, size);
        return metricDataRepository.findByMetricOrderByTimestampDesc(metric, pageable)
                .map(this::convertToDto);
    }

    private MetricDataRequest convertToDto(MetricData metricData) {
        return MetricDataRequest.builder()
                .metricId(metricData.getMetric().getId())
                .metricName(metricData.getMetric().getName())
                .value(metricData.getValue())
                .timestamp(metricData.getTimestamp())
                .tags(metricData.getTags())
                .build();
    }
}