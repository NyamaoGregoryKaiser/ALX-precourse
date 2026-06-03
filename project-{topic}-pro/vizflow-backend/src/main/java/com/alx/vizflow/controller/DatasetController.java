```java
package com.alx.vizflow.controller;

import com.alx.vizflow.exception.ResourceNotFoundException;
import com.alx.vizflow.model.Dataset;
import com.alx.vizflow.model.User;
import com.alx.vizflow.service.DatasetService;
import com.alx.vizflow.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/datasets")
@Slf4j
public class DatasetController {

    private final DatasetService datasetService;

    public DatasetController(DatasetService datasetService) {
        this.datasetService = datasetService;
    }

    // --- CRUD Endpoints ---
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'USER')")
    public ResponseEntity<Dataset> createDataset(@Valid @RequestBody Dataset dataset, @RequestParam Long dataSourceId) {
        User currentUser = SecurityUtil.getCurrentAuthenticatedUser();
        Dataset createdDataset = datasetService.createDataset(dataset, dataSourceId, currentUser);
        log.info("Dataset created: {}", createdDataset.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDataset);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'USER')")
    public ResponseEntity<Dataset> getDatasetById(@PathVariable Long id) {
        Dataset dataset = datasetService.getDatasetById(id);
        return ResponseEntity.ok(dataset);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'USER')")
    public ResponseEntity<List<Dataset>> getAllDatasets() {
        // In a real app, pagination and filtering would be here
        List<Dataset> datasets = datasetService.getAllDatasets();
        return ResponseEntity.ok(datasets);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR') or @datasetServiceImpl.getDatasetById(#id).owner.id == authentication.principal.id")
    public ResponseEntity<Dataset> updateDataset(@PathVariable Long id, @Valid @RequestBody Dataset dataset) {
        User currentUser = SecurityUtil.getCurrentAuthenticatedUser();
        Dataset updatedDataset = datasetService.updateDataset(id, dataset, currentUser);
        log.info("Dataset updated: {}", updatedDataset.getName());
        return ResponseEntity.ok(updatedDataset);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR') or @datasetServiceImpl.getDatasetById(#id).owner.id == authentication.principal.id")
    public ResponseEntity<Void> deleteDataset(@PathVariable Long id) {
        User currentUser = SecurityUtil.getCurrentAuthenticatedUser();
        datasetService.deleteDataset(id, currentUser);
        log.info("Dataset deleted: {}", id);
        return ResponseEntity.noContent().build();
    }

    // --- Data Processing Endpoints ---

    /**
     * Endpoint to fetch processed data for a given dataset, applying its transformations.
     * This is the core API for visualization frontends.
     */
    @GetMapping("/{id}/data")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'USER')")
    public ResponseEntity<List<Map<String, Object>>> getDatasetData(@PathVariable Long id) {
        log.info("Request to get processed data for dataset ID: {}", id);
        try {
            List<Map<String, Object>> rawData = datasetService.fetchRawData(id);
            List<Map<String, Object>> processedData = datasetService.applyTransformations(id, rawData);
            log.info("Successfully fetched and processed data for dataset ID: {}", id);
            return ResponseEntity.ok(processedData);
        } catch (ResourceNotFoundException e) {
            log.warn("Dataset data request failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            log.error("Dataset data processing failed due to invalid configuration: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(List.of(Map.of("error", e.getMessage())));
        } catch (Exception e) {
            log.error("Error fetching or processing data for dataset ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(List.of(Map.of("error", "Failed to retrieve and process data: " + e.getMessage())));
        }
    }
}
```