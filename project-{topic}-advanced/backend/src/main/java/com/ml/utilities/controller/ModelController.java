```java
package com.ml.utilities.controller;

import com.ml.utilities.dto.ModelDTO;
import com.ml.utilities.dto.ModelVersionDTO;
import com.ml.utilities.service.ModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
@RequiredArgsConstructor
@Tag(name = "Model Management", description = "CRUD operations for ML Models and their versions")
public class ModelController {

    private final ModelService modelService;

    // --- Model Operations ---

    @Operation(summary = "Get all ML models")
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ModelDTO>> getAllModels() {
        return ResponseEntity.ok(modelService.getAllModels());
    }

    @Operation(summary = "Get ML model by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ModelDTO> getModelById(@Parameter(description = "ID of the model to retrieve") @PathVariable Long id) {
        return ResponseEntity.ok(modelService.getModelById(id));
    }

    @Operation(summary = "Create a new ML model",
               description = "Only ADMIN users can create new models.")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModelDTO> createModel(@Valid @RequestBody ModelDTO modelDTO) {
        ModelDTO createdModel = modelService.createModel(modelDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdModel);
    }

    @Operation(summary = "Update an existing ML model",
               description = "Only ADMIN users can update models.")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModelDTO> updateModel(@Parameter(description = "ID of the model to update") @PathVariable Long id,
                                                @Valid @RequestBody ModelDTO modelDTO) {
        ModelDTO updatedModel = modelService.updateModel(id, modelDTO);
        return ResponseEntity.ok(updatedModel);
    }

    @Operation(summary = "Delete an ML model",
               description = "Only ADMIN users can delete models. Deleting a model also deletes all its versions.")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteModel(@Parameter(description = "ID of the model to delete") @PathVariable Long id) {
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }

    // --- Model Version Operations ---

    @Operation(summary = "Get all versions for a specific ML model")
    @GetMapping("/{modelId}/versions")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ModelVersionDTO>> getModelVersions(@Parameter(description = "ID of the model") @PathVariable Long modelId) {
        return ResponseEntity.ok(modelService.getModelVersions(modelId));
    }

    @Operation(summary = "Get a specific version of an ML model by ID")
    @GetMapping("/{modelId}/versions/{versionId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ModelVersionDTO> getModelVersionById(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                               @Parameter(description = "ID of the model version") @PathVariable Long versionId) {
        return ResponseEntity.ok(modelService.getModelVersionById(modelId, versionId));
    }

    @Operation(summary = "Add a new version to an ML model",
               description = "Only ADMIN users can add new model versions.")
    @PostMapping("/{modelId}/versions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModelVersionDTO> addModelVersion(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                           @Valid @RequestBody ModelVersionDTO versionDTO) {
        ModelVersionDTO addedVersion = modelService.addModelVersion(modelId, versionDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(addedVersion);
    }

    @Operation(summary = "Update an existing version of an ML model",
               description = "Only ADMIN users can update model versions.")
    @PutMapping("/{modelId}/versions/{versionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModelVersionDTO> updateModelVersion(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                              @Parameter(description = "ID of the model version") @PathVariable Long versionId,
                                                              @Valid @RequestBody ModelVersionDTO versionDTO) {
        ModelVersionDTO updatedVersion = modelService.updateModelVersion(modelId, versionId, versionDTO);
        return ResponseEntity.ok(updatedVersion);
    }

    @Operation(summary = "Delete a specific version of an ML model",
               description = "Only ADMIN users can delete model versions.")
    @DeleteMapping("/{modelId}/versions/{versionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteModelVersion(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                   @Parameter(description = "ID of the model version") @PathVariable Long versionId) {
        modelService.deleteModelVersion(modelId, versionId);
        return ResponseEntity.noContent().build();
    }
}
```