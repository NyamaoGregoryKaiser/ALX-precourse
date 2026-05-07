package com.appinsight.appinsight.service;

import com.appinsight.appinsight.dto.MetricDTO;
import com.appinsight.appinsight.exception.ResourceNotFoundException;
import com.appinsight.appinsight.model.Metric;
import com.appinsight.appinsight.model.MonitoredApplication;
import com.appinsight.appinsight.repository.MetricRepository;
import com.appinsight.appinsight.repository.MonitoredApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricService {

    private final MetricRepository metricRepository;
    private final MonitoredApplicationRepository applicationRepository;

    @Transactional(readOnly = true)
    public List<MetricDTO> getAllMetricsForApplication(Long applicationId) {
        MonitoredApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredApplication not found with id: " + applicationId));
        log.debug("Fetching all metrics for application ID: {}", applicationId);
        return metricRepository.findByApplication(application).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "metrics", key = "#id")
    public MetricDTO getMetricById(Long id) {
        log.debug("Fetching metric with ID: {}", id);
        Metric metric = metricRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Metric not found with id: " + id));
        return convertToDto(metric);
    }

    @Transactional
    public MetricDTO createMetric(Long applicationId, MetricDTO metricDTO) {
        MonitoredApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredApplication not found with id: " + applicationId));

        if (metricRepository.existsByNameAndApplicationId(metricDTO.getName(), applicationId)) {
            throw new IllegalArgumentException("Metric with name '" + metricDTO.getName() + "' already exists for this application.");
        }

        log.info("Creating new metric '{}' for application ID: {}", metricDTO.getName(), applicationId);
        Metric metric = convertToEntity(metricDTO);
        metric.setApplication(application);
        metric = metricRepository.save(metric);
        return convertToDto(metric);
    }

    @Transactional
    @CachePut(value = "metrics", key = "#id")
    public MetricDTO updateMetric(Long id, MetricDTO metricDTO) {
        log.info("Updating metric with ID: {}", id);
        Metric existingMetric = metricRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Metric not found with id: " + id));

        // Check for name conflict if name is changed
        if (!existingMetric.getName().equals(metricDTO.getName()) &&
                metricRepository.existsByNameAndApplicationId(metricDTO.getName(), existingMetric.getApplication().getId())) {
            throw new IllegalArgumentException("Metric with name '" + metricDTO.getName() + "' already exists for this application.");
        }

        existingMetric.setName(metricDTO.getName());
        existingMetric.setDescription(metricDTO.getDescription());
        existingMetric.setType(metricDTO.getType());

        existingMetric = metricRepository.save(existingMetric);
        return convertToDto(existingMetric);
    }

    @Transactional
    @CacheEvict(value = "metrics", key = "#id")
    public void deleteMetric(Long id) {
        log.info("Deleting metric with ID: {}", id);
        if (!metricRepository.existsById(id)) {
            throw new ResourceNotFoundException("Metric not found with id: " + id);
        }
        metricRepository.deleteById(id);
    }

    protected MetricDTO convertToDto(Metric metric) {
        return MetricDTO.builder()
                .id(metric.getId())
                .name(metric.getName())
                .description(metric.getDescription())
                .type(metric.getType())
                .applicationId(metric.getApplication().getId())
                .createdAt(metric.getCreatedAt())
                .updatedAt(metric.getUpdatedAt())
                .build();
    }

    protected Metric convertToEntity(MetricDTO metricDTO) {
        return Metric.builder()
                .name(metricDTO.getName())
                .description(metricDTO.getDescription())
                .type(metricDTO.getType())
                .build();
    }
}