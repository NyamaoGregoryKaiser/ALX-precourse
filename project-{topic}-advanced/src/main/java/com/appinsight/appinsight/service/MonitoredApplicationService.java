package com.appinsight.appinsight.service;

import com.appinsight.appinsight.dto.MonitoredApplicationDTO;
import com.appinsight.appinsight.exception.ResourceNotFoundException;
import com.appinsight.appinsight.model.MonitoredApplication;
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
public class MonitoredApplicationService {

    private final MonitoredApplicationRepository applicationRepository;

    @Transactional(readOnly = true)
    public List<MonitoredApplicationDTO> getAllApplications() {
        log.debug("Fetching all monitored applications.");
        return applicationRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "applications", key = "#id")
    public MonitoredApplicationDTO getApplicationById(Long id) {
        log.debug("Fetching application with ID: {}", id);
        MonitoredApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredApplication not found with id: " + id));
        return convertToDto(application);
    }

    @Transactional(readOnly = true)
    public MonitoredApplicationDTO getApplicationByApiKey(String apiKey) {
        log.debug("Fetching application by API key.");
        MonitoredApplication application = applicationRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredApplication not found for provided API key"));
        return convertToDto(application);
    }

    @Transactional
    public MonitoredApplicationDTO createApplication(MonitoredApplicationDTO applicationDTO) {
        if (applicationRepository.existsByName(applicationDTO.getName())) {
            throw new IllegalArgumentException("Application with name '" + applicationDTO.getName() + "' already exists.");
        }
        log.info("Creating new monitored application: {}", applicationDTO.getName());
        MonitoredApplication application = convertToEntity(applicationDTO);
        application = applicationRepository.save(application);
        return convertToDto(application);
    }

    @Transactional
    @CachePut(value = "applications", key = "#id")
    public MonitoredApplicationDTO updateApplication(Long id, MonitoredApplicationDTO applicationDTO) {
        log.info("Updating application with ID: {}", id);
        MonitoredApplication existingApplication = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredApplication not found with id: " + id));

        // Check for name conflict if name is changed
        if (!existingApplication.getName().equals(applicationDTO.getName()) && applicationRepository.existsByName(applicationDTO.getName())) {
            throw new IllegalArgumentException("Application with name '" + applicationDTO.getName() + "' already exists.");
        }

        existingApplication.setName(applicationDTO.getName());
        existingApplication.setDescription(applicationDTO.getDescription());
        // API key should ideally not be updatable or require special permissions
        // existingApplication.setApiKey(applicationDTO.getApiKey());

        existingApplication = applicationRepository.save(existingApplication);
        return convertToDto(existingApplication);
    }

    @Transactional
    @CacheEvict(value = "applications", key = "#id")
    public void deleteApplication(Long id) {
        log.info("Deleting application with ID: {}", id);
        if (!applicationRepository.existsById(id)) {
            throw new ResourceNotFoundException("MonitoredApplication not found with id: " + id);
        }
        applicationRepository.deleteById(id);
    }

    private MonitoredApplicationDTO convertToDto(MonitoredApplication application) {
        return MonitoredApplicationDTO.builder()
                .id(application.getId())
                .name(application.getName())
                .description(application.getDescription())
                .apiKey(application.getApiKey())
                .createdAt(application.getCreatedAt())
                .updatedAt(application.getUpdatedAt())
                .build();
    }

    private MonitoredApplication convertToEntity(MonitoredApplicationDTO applicationDTO) {
        return MonitoredApplication.builder()
                .name(applicationDTO.getName())
                .description(applicationDTO.getDescription())
                .build();
    }
}