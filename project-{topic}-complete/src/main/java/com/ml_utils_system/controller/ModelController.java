```java
package com.ml_utils_system.controller;

import com.ml_utils_system.dto.ModelDto;
import com.ml_utils_system.dto.ModelVersionDto;
import com.ml_utils_system.dto.PredictionRequestDto;
import com.ml_utils_system.dto.PredictionResponseDto;
import com.ml_utils_system.service.ModelService;
import com.ml_utils_system.service.PredictionService;
import com.ml_utils_system.util.CustomLogger;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing Machine Learning models and their versions,
 * including a simulated prediction endpoint.
 */
@RestController
@RequestMapping("/api/models")
@Tag(name = "ML Models", description = "API for managing Machine Learning Models, Versions, and Predictions")
public class ModelController {

    private static final Logger logger = CustomLogger.getLogger(ModelController.class);

    @Autowired
    private ModelService modelService;

    @Autowired
    private PredictionService predictionService;

    // --- Model Operations ---

    /**
     * Creates a new ML model.
     * Requires ADMIN role.
     *
     * @param modelDto The DTO containing the model details.
     * @return A ResponseEntity with the created ModelDto and HTTP status 201 Created.
     */
    @Operation(summary = "Create a new ML model",
            description = "Requires ADMIN role. Registers a new high-level ML model.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Model created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or model with name already exists",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ModelDto> createModel(@Valid @RequestBody ModelDto modelDto) {
        logger.info("Received request to create model: {}", modelDto.getName());
        ModelDto createdModel = modelService.createModel(modelDto);
        return new ResponseEntity<>(createdModel, HttpStatus.CREATED);
    }

    /**
     * Retrieves an ML model by its ID.
     * Requires USER or ADMIN role.
     *
     * @param id The ID of the model.
     * @return A ResponseEntity with the ModelDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get an ML model by ID",
            description = "Requires USER or ADMIN role. Retrieves a specific ML model, including its versions.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Model found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelDto.class))),
            @ApiResponse(responseCode = "404", description = "Model not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<ModelDto> getModelById(@PathVariable Long id) {
        logger.info("Received request to get model with ID: {}", id);
        ModelDto model = modelService.getModelById(id);
        return ResponseEntity.ok(model);
    }

    /**
     * Retrieves all ML models with pagination.
     * Requires USER or ADMIN role.
     *
     * @param page The page number (default 0).
     * @param size The number of items per page (default 10).
     * @param sortBy The field to sort by (default 'id').
     * @param sortDir The sort direction (default 'asc').
     * @return A ResponseEntity with a Page of ModelDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get all ML models with pagination",
            description = "Requires USER or ADMIN role. Retrieves a paginated list of all ML models.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of models",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<Page<ModelDto>> getAllModels(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        logger.info("Received request to get all models (page: {}, size: {}, sortBy: {}, sortDir: {})", page, size, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ModelDto> models = modelService.getAllModels(pageable);
        return ResponseEntity.ok(models);
    }

    /**
     * Updates an existing ML model's metadata.
     * Requires ADMIN role.
     *
     * @param id The ID of the model to update.
     * @param modelDto The DTO containing updated model information.
     * @return A ResponseEntity with the updated ModelDto and HTTP status 200 OK.
     */
    @Operation(summary = "Update an existing ML model",
            description = "Requires ADMIN role. Updates the metadata of an existing ML model.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Model updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or model name conflict",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Model not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ModelDto> updateModel(@PathVariable Long id, @Valid @RequestBody ModelDto modelDto) {
        logger.info("Received request to update model with ID: {}", id);
        ModelDto updatedModel = modelService.updateModel(id, modelDto);
        return ResponseEntity.ok(updatedModel);
    }

    /**
     * Deletes an ML model by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the model to delete.
     * @return A ResponseEntity with HTTP status 204 No Content.
     */
    @Operation(summary = "Delete an ML model by ID",
            description = "Requires ADMIN role. Deletes a specific ML model and all its versions.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Model deleted successfully",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Model not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModel(@PathVariable Long id) {
        logger.info("Received request to delete model with ID: {}", id);
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }

    // --- Model Version Operations ---

    /**
     * Creates a new version for a specific ML model.
     * Requires ADMIN role.
     *
     * @param modelId The ID of the parent model.
     * @param versionDto The DTO containing the model version details.
     * @return A ResponseEntity with the created ModelVersionDto and HTTP status 201 Created.
     */
    @Operation(summary = "Create a new version for an ML model",
            description = "Requires ADMIN role. Registers a new version for an existing ML model.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Model version created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelVersionDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or version number conflict",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Parent model or associated feature not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{modelId}/versions")
    public ResponseEntity<ModelVersionDto> createModelVersion(@PathVariable Long modelId, @Valid @RequestBody ModelVersionDto versionDto) {
        logger.info("Received request to create version '{}' for model ID: {}", versionDto.getVersionNumber(), modelId);
        versionDto.setModelId(modelId); // Ensure modelId from path is used
        ModelVersionDto createdVersion = modelService.createModelVersion(modelId, versionDto);
        return new ResponseEntity<>(createdVersion, HttpStatus.CREATED);
    }

    /**
     * Retrieves a specific model version by its ID.
     * Requires USER or ADMIN role.
     *
     * @param modelId The ID of the parent model (for path consistency, though not strictly used by service).
     * @param versionId The ID of the model version.
     * @return A ResponseEntity with the ModelVersionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get a specific model version by ID",
            description = "Requires USER or ADMIN role. Retrieves details of a specific ML model version.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Model version found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelVersionDto.class))),
            @ApiResponse(responseCode = "404", description = "Model version not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{modelId}/versions/{versionId}")
    public ResponseEntity<ModelVersionDto> getModelVersionById(@PathVariable Long modelId, @PathVariable Long versionId) {
        logger.info("Received request to get model version ID: {} for model ID: {}", versionId, modelId);
        ModelVersionDto version = modelService.getModelVersionById(versionId);
        return ResponseEntity.ok(version);
    }

    /**
     * Retrieves all versions for a given ML model.
     * Requires USER or ADMIN role.
     *
     * @param modelId The ID of the parent model.
     * @return A ResponseEntity with a list of ModelVersionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get all versions for an ML model",
            description = "Requires USER or ADMIN role. Retrieves a list of all versions associated with a specific ML model.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of model versions",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = List.class))),
            @ApiResponse(responseCode = "404", description = "Parent model not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{modelId}/versions")
    public ResponseEntity<List<ModelVersionDto>> getModelVersionsByModelId(@PathVariable Long modelId) {
        logger.info("Received request to get all versions for model ID: {}", modelId);
        List<ModelVersionDto> versions = modelService.getModelVersionsByModelId(modelId);
        return ResponseEntity.ok(versions);
    }

    /**
     * Updates an existing model version.
     * Requires ADMIN role.
     *
     * @param modelId The ID of the parent model (for path consistency).
     * @param versionId The ID of the model version to update.
     * @param versionDto The DTO containing updated model version information.
     * @return A ResponseEntity with the updated ModelVersionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Update an existing model version",
            description = "Requires ADMIN role. Updates the details of an existing ML model version.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Model version updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = ModelVersionDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or version number/feature conflict",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Model version or associated feature not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{modelId}/versions/{versionId}")
    public ResponseEntity<ModelVersionDto> updateModelVersion(@PathVariable Long modelId, @PathVariable Long versionId, @Valid @RequestBody ModelVersionDto versionDto) {
        logger.info("Received request to update model version ID: {} for model ID: {}", versionId, modelId);
        versionDto.setModelId(modelId); // Ensure modelId from path is set
        ModelVersionDto updatedVersion = modelService.updateModelVersion(versionId, versionDto);
        return ResponseEntity.ok(updatedVersion);
    }

    /**
     * Deletes a model version by its ID.
     * Requires ADMIN role.
     *
     * @param modelId The ID of the parent model (for path consistency).
     * @param versionId The ID of the model version to delete.
     * @return A ResponseEntity with HTTP status 204 No Content.
     */
    @Operation(summary = "Delete a model version by ID",
            description = "Requires ADMIN role. Deletes a specific ML model version.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Model version deleted successfully",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Model version not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{modelId}/versions/{versionId}")
    public ResponseEntity<Void> deleteModelVersion(@PathVariable Long modelId, @PathVariable Long versionId) {
        logger.info("Received request to delete model version ID: {} for model ID: {}", versionId, modelId);
        modelService.deleteModelVersion(versionId);
        return ResponseEntity.noContent().build();
    }

    // --- Prediction Operations ---

    /**
     * Provides a simulated prediction based on model name, version, and input features.
     * Requires USER or ADMIN role.
     *
     * @param requestDto The DTO containing model name, version, and input features.
     * @return A ResponseEntity with the PredictionResponseDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get a prediction from an ML model version",
            description = "Requires USER or ADMIN role. Simulates a prediction based on provided input features against a specific model version.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Prediction successful",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PredictionResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or missing features",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Model or model version not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PostMapping("/predict")
    public ResponseEntity<PredictionResponseDto> getPrediction(@Valid @RequestBody PredictionRequestDto requestDto) {
        logger.info("Received prediction request for model: {} (version: {})", requestDto.getModelName(), requestDto.getModelVersion());
        PredictionResponseDto response = predictionService.getPrediction(requestDto);
        return ResponseEntity.ok(response);
    }
}
```