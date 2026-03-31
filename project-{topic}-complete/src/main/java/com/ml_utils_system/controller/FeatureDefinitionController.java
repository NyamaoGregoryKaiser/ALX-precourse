```java
package com.ml_utils_system.controller;

import com.ml_utils_system.dto.FeatureDefinitionDto;
import com.ml_utils_system.service.FeatureDefinitionService;
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

/**
 * REST Controller for managing feature definitions.
 * Provides API endpoints for CRUD operations on feature definition resources.
 */
@RestController
@RequestMapping("/api/features")
@Tag(name = "Feature Definitions", description = "API for managing Machine Learning feature definitions")
public class FeatureDefinitionController {

    private static final Logger logger = CustomLogger.getLogger(FeatureDefinitionController.class);

    @Autowired
    private FeatureDefinitionService featureDefinitionService;

    /**
     * Creates a new feature definition.
     * Requires ADMIN role.
     *
     * @param dto The DTO containing the feature definition details.
     * @return A ResponseEntity with the created FeatureDefinitionDto and HTTP status 201 Created.
     */
    @Operation(summary = "Create a new feature definition",
            description = "Requires ADMIN role. Creates a new entry for a feature definition.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Feature definition created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FeatureDefinitionDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or feature with same name/version already exists",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Source Dataset not found (if provided)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<FeatureDefinitionDto> createFeatureDefinition(@Valid @RequestBody FeatureDefinitionDto dto) {
        logger.info("Received request to create feature definition: {} (version: {})", dto.getName(), dto.getVersion());
        FeatureDefinitionDto createdFeature = featureDefinitionService.createFeatureDefinition(dto);
        return new ResponseEntity<>(createdFeature, HttpStatus.CREATED);
    }

    /**
     * Retrieves a feature definition by its ID.
     * Requires USER or ADMIN role.
     *
     * @param id The ID of the feature definition.
     * @return A ResponseEntity with the FeatureDefinitionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get a feature definition by ID",
            description = "Requires USER or ADMIN role. Retrieves a specific feature definition.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feature definition found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FeatureDefinitionDto.class))),
            @ApiResponse(responseCode = "404", description = "Feature definition not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<FeatureDefinitionDto> getFeatureDefinitionById(@PathVariable Long id) {
        logger.info("Received request to get feature definition with ID: {}", id);
        FeatureDefinitionDto feature = featureDefinitionService.getFeatureDefinitionById(id);
        return ResponseEntity.ok(feature);
    }

    /**
     * Retrieves all feature definitions with pagination.
     * Requires USER or ADMIN role.
     *
     * @param page The page number (default 0).
     * @param size The number of items per page (default 10).
     * @param sortBy The field to sort by (default 'id').
     * @param sortDir The sort direction (default 'asc').
     * @return A ResponseEntity with a Page of FeatureDefinitionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get all feature definitions with pagination",
            description = "Requires USER or ADMIN role. Retrieves a paginated list of all feature definitions.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of feature definitions",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<Page<FeatureDefinitionDto>> getAllFeatureDefinitions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        logger.info("Received request to get all feature definitions (page: {}, size: {}, sortBy: {}, sortDir: {})", page, size, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<FeatureDefinitionDto> features = featureDefinitionService.getAllFeatureDefinitions(pageable);
        return ResponseEntity.ok(features);
    }

    /**
     * Updates an existing feature definition.
     * Requires ADMIN role.
     *
     * @param id The ID of the feature definition to update.
     * @param dto The DTO containing updated feature definition information.
     * @return A ResponseEntity with the updated FeatureDefinitionDto and HTTP status 200 OK.
     */
    @Operation(summary = "Update an existing feature definition",
            description = "Requires ADMIN role. Updates the details of an existing feature definition.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feature definition updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FeatureDefinitionDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or feature name/version conflict",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Feature definition or Source Dataset not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<FeatureDefinitionDto> updateFeatureDefinition(@PathVariable Long id, @Valid @RequestBody FeatureDefinitionDto dto) {
        logger.info("Received request to update feature definition with ID: {}", id);
        FeatureDefinitionDto updatedFeature = featureDefinitionService.updateFeatureDefinition(id, dto);
        return ResponseEntity.ok(updatedFeature);
    }

    /**
     * Deletes a feature definition by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the feature definition to delete.
     * @return A ResponseEntity with HTTP status 204 No Content.
     */
    @Operation(summary = "Delete a feature definition by ID",
            description = "Requires ADMIN role. Deletes a specific feature definition.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Feature definition deleted successfully",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Feature definition not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFeatureDefinition(@PathVariable Long id) {
        logger.info("Received request to delete feature definition with ID: {}", id);
        featureDefinitionService.deleteFeatureDefinition(id);
        return ResponseEntity.noContent().build();
    }
}
```