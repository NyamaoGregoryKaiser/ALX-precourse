```java
package com.ml.utilities.system.controller;

import com.ml.utilities.system.dto.FeatureSetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.service.FeatureSetService;
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
@RequestMapping("/api/feature-sets")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Feature Sets", description = "API for managing ML Feature Sets")
@SecurityRequirement(name = "Bearer Authentication")
public class FeatureSetController {

    private final FeatureSetService featureSetService;

    @Operation(summary = "Create a new feature set",
            description = "Registers a new feature set. Requires ADMIN or USER role.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<FeatureSetDTO> createFeatureSet(@Valid @RequestBody FeatureSetDTO featureSetDTO) {
        log.info("Received request to create feature set: {} (version {})", featureSetDTO.getName(), featureSetDTO.getVersion());
        FeatureSetDTO createdFeatureSet = featureSetService.createFeatureSet(featureSetDTO);
        log.info("Feature set created with ID: {}", createdFeatureSet.getId());
        return new ResponseEntity<>(createdFeatureSet, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a feature set by ID",
            description = "Retrieves a single feature set by its unique ID. Requires ADMIN or USER role.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "featureSets", key = "#id")
    public ResponseEntity<FeatureSetDTO> getFeatureSetById(@Parameter(description = "ID of the feature set to retrieve", required = true) @PathVariable Long id) {
        log.info("Received request to get feature set by ID: {}", id);
        FeatureSetDTO featureSetDTO = featureSetService.getFeatureSetById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feature Set not found with id: " + id));
        log.debug("Found feature set with ID: {}", id);
        return ResponseEntity.ok(featureSetDTO);
    }

    @Operation(summary = "Get all feature sets with pagination",
            description = "Retrieves a paginated list of all feature sets. Requires ADMIN or USER role.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "featureSets", key = "'all' + #page + '-' + #size")
    public ResponseEntity<Page<FeatureSetDTO>> getAllFeatureSets(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10") @RequestParam(defaultValue = "10") int size) {
        log.info("Received request to get all feature sets (page: {}, size: {})", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<FeatureSetDTO> featureSets = featureSetService.getAllFeatureSets(pageable);
        log.debug("Retrieved {} feature sets (page: {}, total pages: {})", featureSets.getNumberOfElements(), page, featureSets.getTotalPages());
        return ResponseEntity.ok(featureSets);
    }

    @Operation(summary = "Update an existing feature set",
            description = "Updates the details of an existing feature set. Requires ADMIN or USER role.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @CachePut(value = "featureSets", key = "#id")
    public ResponseEntity<FeatureSetDTO> updateFeatureSet(
            @Parameter(description = "ID of the feature set to update", required = true) @PathVariable Long id,
            @Valid @RequestBody FeatureSetDTO featureSetDTO) {
        log.info("Received request to update feature set with ID: {}", id);
        FeatureSetDTO updatedFeatureSet = featureSetService.updateFeatureSet(id, featureSetDTO);
        log.info("Feature set with ID {} updated.", id);
        return ResponseEntity.ok(updatedFeatureSet);
    }

    @Operation(summary = "Delete a feature set",
            description = "Deletes a feature set by its ID. Requires ADMIN role.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "featureSets", key = "#id")
    public ResponseEntity<Void> deleteFeatureSet(@Parameter(description = "ID of the feature set to delete", required = true) @PathVariable Long id) {
        log.info("Received request to delete feature set with ID: {}", id);
        featureSetService.deleteFeatureSet(id);
        log.info("Feature set with ID {} deleted.", id);
        return ResponseEntity.noContent().build();
    }
}
```