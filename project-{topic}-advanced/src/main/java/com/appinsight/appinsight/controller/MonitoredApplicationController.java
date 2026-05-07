package com.appinsight.appinsight.controller;

import com.appinsight.appinsight.dto.MonitoredApplicationDTO;
import com.appinsight.appinsight.service.MonitoredApplicationService;
import com.bucket4j.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@Slf4j
public class MonitoredApplicationController {

    private final MonitoredApplicationService applicationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<MonitoredApplicationDTO>> getAllApplications() {
        log.info("Received request to get all applications.");
        List<MonitoredApplicationDTO> applications = applicationService.getAllApplications();
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @RateLimit(capacity = 5, period = 60) // 5 requests per minute for this specific endpoint
    public ResponseEntity<MonitoredApplicationDTO> getApplicationById(@PathVariable Long id) {
        log.info("Received request to get application with ID: {}", id);
        MonitoredApplicationDTO application = applicationService.getApplicationById(id);
        return ResponseEntity.ok(application);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MonitoredApplicationDTO> createApplication(@Valid @RequestBody MonitoredApplicationDTO applicationDTO) {
        log.info("Received request to create application: {}", applicationDTO.getName());
        MonitoredApplicationDTO createdApplication = applicationService.createApplication(applicationDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdApplication);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MonitoredApplicationDTO> updateApplication(@PathVariable Long id, @Valid @RequestBody MonitoredApplicationDTO applicationDTO) {
        log.info("Received request to update application with ID: {}", id);
        MonitoredApplicationDTO updatedApplication = applicationService.updateApplication(id, applicationDTO);
        return ResponseEntity.ok(updatedApplication);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        log.info("Received request to delete application with ID: {}", id);
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }
}