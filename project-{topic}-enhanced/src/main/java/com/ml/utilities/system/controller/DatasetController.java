```java
package com.ml.utilities.system.controller;

import com.ml.utilities.system.dto.DatasetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.service.DatasetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Datasets", description = "API for managing ML Datasets")
@SecurityRequirement(name = "Bearer Authentication")
public class DatasetController {

    private final DatasetService datasetService;

    @Operation(summary = "Create a new dataset",
            description = "Registers a new dataset. Requires ADMIN or USER role.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<DatasetDTO> createDataset(@Valid @RequestBody DatasetDTO datasetDTO) {
        log.info("Received request to create dataset: {} (version {})", datasetDTO.getName(), datasetDTO.getVersion());
        DatasetDTO createdDataset = datasetService.createDataset(datasetDTO);
        log.info("Dataset created with ID: {}", createdDataset.getId());
        return new ResponseEntity<>(createdDataset, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a dataset by ID",
            description = "Retrieves a single dataset by its unique ID. Requires ADMIN or USER role.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "datasets", key = "#id")
    public ResponseEntity<DatasetDTO> getDatasetById(@Parameter(description = "ID of the dataset to retrieve", required = true) @PathVariable Long id) {
        log.info("Received request to get dataset by ID: {}", id);
        DatasetDTO datasetDTO = datasetService.getDatasetById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));
        log.debug("Found dataset with ID: {}", id);
        return ResponseEntity.ok(datasetDTO);
    }

    @Operation(summary = "Get all datasets with pagination",
            description = "Retrieves a paginated list of all datasets. Requires ADMIN or USER role.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "datasets", key = "'all' + #page + '-' + #size")
    public ResponseEntity<Page<DatasetDTO>> getAllDatasets(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10") @RequestParam(defaultValue = "10") int size) {
        log.info("Received request to get all datasets (page: {}, size: {})", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<DatasetDTO> datasets = datasetService.getAllDatasets(pageable);
        log.debug("Retrieved {} datasets (page: {}, total pages: {})", datasets.getNumberOfElements(), page, datasets.getTotalPages());
        return ResponseEntity.ok(datasets);
    }

    @Operation(summary = "Update an existing dataset",
            description = "Updates the details of an existing dataset. Requires ADMIN or USER role.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @CachePut(value = "datasets", key = "#id")
    public ResponseEntity<DatasetDTO> updateDataset(
            @Parameter(description = "ID of the dataset to update", required = true) @PathVariable Long id,
            @Valid @RequestBody DatasetDTO datasetDTO) {
        log.info("Received request to update dataset with ID: {}", id);
        DatasetDTO updatedDataset = datasetService.updateDataset(id, datasetDTO);
        log.info("Dataset with ID {} updated.", id);
        return ResponseEntity.ok(updatedDataset);
    }

    @Operation(summary = "Delete a dataset",
            description = "Deletes a dataset by its ID. Requires ADMIN role.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "datasets", key = "#id")
    public ResponseEntity<Void> deleteDataset(@Parameter(description = "ID of the dataset to delete", required = true) @PathVariable Long id) {
        log.info("Received request to delete dataset with ID: {}", id);
        datasetService.deleteDataset(id);
        log.info("Dataset with ID {} deleted.", id);
        return ResponseEntity.noContent().build();
    }
}
```