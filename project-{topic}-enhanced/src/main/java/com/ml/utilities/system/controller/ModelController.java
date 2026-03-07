```java
package com.ml.utilities.system.controller;

import com.ml.utilities.system.dto.ModelDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.service.ModelService;
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
@RequestMapping("/api/models")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Models", description = "API for managing ML Models")
@SecurityRequirement(name = "Bearer Authentication")
public class ModelController {

    private final ModelService modelService;

    @Operation(summary = "Create a new model",
            description = "Registers a new machine learning model. Requires ADMIN or USER role.")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ModelDTO> createModel(@Valid @RequestBody ModelDTO modelDTO) {
        log.info("Received request to create model: {}", modelDTO.getName());
        ModelDTO createdModel = modelService.createModel(modelDTO);
        log.info("Model created with ID: {}", createdModel.getId());
        return new ResponseEntity<>(createdModel, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a model by ID",
            description = "Retrieves a single model by its unique ID. Requires ADMIN or USER role.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "models", key = "#id")
    public ResponseEntity<ModelDTO> getModelById(@Parameter(description = "ID of the model to retrieve", required = true) @PathVariable Long id) {
        log.info("Received request to get model by ID: {}", id);
        ModelDTO modelDTO = modelService.getModelById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + id));
        log.debug("Found model with ID: {}", id);
        return ResponseEntity.ok(modelDTO);
    }

    @Operation(summary = "Get all models with pagination",
            description = "Retrieves a paginated list of all models. Requires ADMIN or USER role.")
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @Cacheable(value = "models", key = "'all' + #page + '-' + #size")
    public ResponseEntity<Page<ModelDTO>> getAllModels(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10") @RequestParam(defaultValue = "10") int size) {
        log.info("Received request to get all models (page: {}, size: {})", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<ModelDTO> models = modelService.getAllModels(pageable);
        log.debug("Retrieved {} models (page: {}, total pages: {})", models.getNumberOfElements(), page, models.getTotalPages());
        return ResponseEntity.ok(models);
    }

    @Operation(summary = "Update an existing model",
            description = "Updates the details of an existing model. Requires ADMIN or USER role.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @CachePut(value = "models", key = "#id")
    public ResponseEntity<ModelDTO> updateModel(
            @Parameter(description = "ID of the model to update", required = true) @PathVariable Long id,
            @Valid @RequestBody ModelDTO modelDTO) {
        log.info("Received request to update model with ID: {}", id);
        ModelDTO updatedModel = modelService.updateModel(id, modelDTO);
        log.info("Model with ID {} updated.", id);
        return ResponseEntity.ok(updatedModel);
    }

    @Operation(summary = "Delete a model",
            description = "Deletes a model by its ID. Requires ADMIN role.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = "models", key = "#id")
    public ResponseEntity<Void> deleteModel(@Parameter(description = "ID of the model to delete", required = true) @PathVariable Long id) {
        log.info("Received request to delete model with ID: {}", id);
        modelService.deleteModel(id);
        log.info("Model with ID {} deleted.", id);
        return ResponseEntity.noContent().build();
    }
}
```