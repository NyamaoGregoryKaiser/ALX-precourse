```java
package com.ml_utils_system.controller;

import com.ml_utils_system.dto.DatasetDto;
import com.ml_utils_system.service.DatasetService;
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
import org.springframework.web.multipart.MultipartFile;

/**
 * REST Controller for managing datasets.
 * Provides API endpoints for CRUD operations on dataset resources.
 */
@RestController
@RequestMapping("/api/datasets")
@Tag(name = "Datasets", description = "API for managing Machine Learning datasets")
public class DatasetController {

    private static final Logger logger = CustomLogger.getLogger(DatasetController.class);

    @Autowired
    private DatasetService datasetService;

    /**
     * Uploads a new dataset file and creates its metadata entry.
     * Requires ADMIN role.
     *
     * @param file The dataset file to upload.
     * @param name The name of the dataset.
     * @param description A description of the dataset.
     * @return A ResponseEntity with the created DatasetDto and HTTP status 201 Created.
     */
    @Operation(summary = "Upload a new dataset",
            description = "Requires ADMIN role. Uploads a file and creates a new dataset entry.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Dataset uploaded successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DatasetDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or dataset with name already exists",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DatasetDto> uploadDataset(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam(value = "description", required = false) String description) {
        logger.info("Received request to upload dataset: {}", name);
        DatasetDto createdDataset = datasetService.uploadDataset(file, name, description);
        return new ResponseEntity<>(createdDataset, HttpStatus.CREATED);
    }

    /**
     * Retrieves a dataset by its ID.
     * Requires USER or ADMIN role.
     *
     * @param id The ID of the dataset.
     * @return A ResponseEntity with the DatasetDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get a dataset by ID",
            description = "Requires USER or ADMIN role. Retrieves a specific dataset.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dataset found",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DatasetDto.class))),
            @ApiResponse(responseCode = "404", description = "Dataset not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<DatasetDto> getDatasetById(@PathVariable Long id) {
        logger.info("Received request to get dataset with ID: {}", id);
        DatasetDto dataset = datasetService.getDatasetById(id);
        return ResponseEntity.ok(dataset);
    }

    /**
     * Retrieves all datasets with pagination.
     * Requires USER or ADMIN role.
     *
     * @param page The page number (default 0).
     * @param size The number of items per page (default 10).
     * @param sortBy The field to sort by (default 'id').
     * @param sortDir The sort direction (default 'asc').
     * @return A ResponseEntity with a Page of DatasetDto and HTTP status 200 OK.
     */
    @Operation(summary = "Get all datasets with pagination",
            description = "Requires USER or ADMIN role. Retrieves a paginated list of all datasets.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of datasets",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<Page<DatasetDto>> getAllDatasets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        logger.info("Received request to get all datasets (page: {}, size: {}, sortBy: {}, sortDir: {})", page, size, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<DatasetDto> datasets = datasetService.getAllDatasets(pageable);
        return ResponseEntity.ok(datasets);
    }

    /**
     * Updates an existing dataset's metadata.
     * Requires ADMIN role.
     *
     * @param id The ID of the dataset to update.
     * @param datasetDto The DTO containing updated dataset information.
     * @return A ResponseEntity with the updated DatasetDto and HTTP status 200 OK.
     */
    @Operation(summary = "Update an existing dataset",
            description = "Requires ADMIN role. Updates the metadata of an existing dataset.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dataset updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DatasetDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or dataset name conflict",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Dataset not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<DatasetDto> updateDataset(@PathVariable Long id, @Valid @RequestBody DatasetDto datasetDto) {
        logger.info("Received request to update dataset with ID: {}", id);
        DatasetDto updatedDataset = datasetService.updateDataset(id, datasetDto);
        return ResponseEntity.ok(updatedDataset);
    }

    /**
     * Deletes a dataset by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the dataset to delete.
     * @return A ResponseEntity with HTTP status 204 No Content.
     */
    @Operation(summary = "Delete a dataset by ID",
            description = "Requires ADMIN role. Deletes a specific dataset and its associated file.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Dataset deleted successfully",
                    content = @Content),
            @ApiResponse(responseCode = "404", description = "Dataset not found",
                    content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden (Insufficient privileges)", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataset(@PathVariable Long id) {
        logger.info("Received request to delete dataset with ID: {}", id);
        datasetService.deleteDataset(id);
        return ResponseEntity.noContent().build();
    }
}
```