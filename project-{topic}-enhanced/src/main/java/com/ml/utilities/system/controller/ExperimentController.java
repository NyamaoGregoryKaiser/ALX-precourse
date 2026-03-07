```java
package com.ml.utilities.system.controller;

import com.ml.utilities.system.dto.ExperimentDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.service.ExperimentService;
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
@RequestMapping("/api/experiments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Experiments", description = "API for managing ML Experiments")
@SecurityRequirement(name = "Bearer Authentication") // Apply JWT security to all endpoints in this controller
public class ExperimentController {

    private final ExperimentService experimentService;

    @Operation(summary = "Create a new experiment",
            description = "Creates a new machine learning experiment. Requires ADMIN or USER role.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ExperimentDTO> createExperiment(@Valid @RequestBody ExperimentDTO experimentDTO) {
        log.info("Received request to create experiment: {}", experimentDTO.getName());
        ExperimentDTO createdExperiment = experimentService.createExperiment(experimentDTO);
        log.info("Experiment created with ID: {}", createdExperiment.getId());
        return new ResponseEntity<>(createdExperiment, HttpStatus.CREATED);
    }

    @Operation(summary = "Get an experiment by ID",
            description = "Retrieves a single experiment by its unique ID. Requires ADMIN or USER role.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "experiments", key = "#id") // Cache the result of this method
    public ResponseEntity<ExperimentDTO> getExperimentById(@Parameter(description = "ID of the experiment to retrieve", required = true) @PathVariable Long id) {
        log.info("Received request to get experiment by ID: {}", id);
        ExperimentDTO experimentDTO = experimentService.getExperimentById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experiment not found with id: " + id));
        log.debug("Found experiment with ID: {}", id);
        return ResponseEntity.ok(experimentDTO);
    }

    @Operation(summary = "Get all experiments with pagination",
            description = "Retrieves a paginated list of all experiments. Requires ADMIN or USER role.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "experiments", key = "'all' + #page + '-' + #size") // Cache all experiments with pagination
    public ResponseEntity<Page<ExperimentDTO>> getAllExperiments(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10") @RequestParam(defaultValue = "10") int size) {
        log.info("Received request to get all experiments (page: {}, size: {})", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<ExperimentDTO> experiments = experimentService.getAllExperiments(pageable);
        log.debug("Retrieved {} experiments (page: {}, total pages: {})", experiments.getNumberOfElements(), page, experiments.getTotalPages());
        return ResponseEntity.ok(experiments);
    }

    @Operation(summary = "Update an existing experiment",
            description = "Updates the details of an existing experiment. Requires ADMIN or USER role.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @CachePut(value = "experiments", key = "#id") // Update cache after modification
    public ResponseEntity<ExperimentDTO> updateExperiment(
            @Parameter(description = "ID of the experiment to update", required = true) @PathVariable Long id,
            @Valid @RequestBody ExperimentDTO experimentDTO) {
        log.info("Received request to update experiment with ID: {}", id);
        ExperimentDTO updatedExperiment = experimentService.updateExperiment(id, experimentDTO);
        log.info("Experiment with ID {} updated.", id);
        return ResponseEntity.ok(updatedExperiment);
    }

    @Operation(summary = "Delete an experiment",
            description = "Deletes an experiment by its ID. Requires ADMIN role.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can delete
    @CacheEvict(value = "experiments", key = "#id") // Evict the deleted item from cache
    public ResponseEntity<Void> deleteExperiment(@Parameter(description = "ID of the experiment to delete", required = true) @PathVariable Long id) {
        log.info("Received request to delete experiment with ID: {}", id);
        experimentService.deleteExperiment(id);
        log.info("Experiment with ID {} deleted.", id);
        return ResponseEntity.noContent().build();
    }
}
```