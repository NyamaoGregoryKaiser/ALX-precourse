package com.mlutil.ml_utilities_system.controller;

import com.mlutil.ml_utilities_system.dto.dataset.DatasetMetadataDTO;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.service.DatasetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Dataset Management", description = "API for managing ML datasets (upload, download, list, delete)")
public class DatasetController {

    private final DatasetService datasetService;

    @Operation(summary = "Upload a new dataset (CSV file)",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Dataset uploaded successfully"),
                    @ApiResponse(responseCode = "400", description = "Invalid file or upload error")
            })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<DatasetMetadataDTO> uploadDataset(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        log.info("User {} attempting to upload dataset: {}", principal.getName(), file.getOriginalFilename());
        Dataset dataset = datasetService.saveDataset(file, principal.getName());
        log.info("Dataset {} uploaded successfully by user {}", dataset.getFilename(), principal.getName());
        return new ResponseEntity<>(new DatasetMetadataDTO(dataset), HttpStatus.CREATED);
    }

    @Operation(summary = "Get all datasets for the authenticated user",
            responses = {
                    @ApiResponse(responseCode = "200", description = "List of datasets retrieved"),
                    @ApiResponse(responseCode = "404", description = "No datasets found")
            })
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<DatasetMetadataDTO>> getAllUserDatasets(Principal principal) {
        log.info("Fetching all datasets for user: {}", principal.getName());
        List<Dataset> datasets = datasetService.getDatasetsByOwner(principal.getName());
        List<DatasetMetadataDTO> dtos = datasets.stream()
                .map(DatasetMetadataDTO::new)
                .collect(Collectors.toList());
        log.info("Retrieved {} datasets for user {}", dtos.size(), principal.getName());
        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "Get a specific dataset by ID",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Dataset retrieved successfully"),
                    @ApiResponse(responseCode = "404", description = "Dataset not found")
            })
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<DatasetMetadataDTO> getDatasetById(@PathVariable UUID id, Principal principal) {
        log.info("Fetching dataset with ID {} for user {}", id, principal.getName());
        Dataset dataset = datasetService.getDatasetByIdAndOwner(id, principal.getName());
        log.info("Dataset {} retrieved for user {}", dataset.getFilename(), principal.getName());
        return ResponseEntity.ok(new DatasetMetadataDTO(dataset));
    }

    @Operation(summary = "Download a dataset file by ID",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Dataset downloaded successfully"),
                    @ApiResponse(responseCode = "404", description = "Dataset not found")
            })
    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Resource> downloadDataset(@PathVariable UUID id, Principal principal) throws IOException {
        log.info("User {} attempting to download dataset with ID: {}", principal.getName(), id);
        Resource resource = datasetService.downloadDatasetFile(id, principal.getName());
        Dataset dataset = datasetService.getDatasetByIdAndOwner(id, principal.getName()); // Re-fetch to get filename
        log.info("Dataset {} downloaded by user {}", dataset.getFilename(), principal.getName());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + dataset.getFilename() + "\"")
                .body(resource);
    }

    @Operation(summary = "Delete a dataset by ID",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Dataset deleted successfully"),
                    @ApiResponse(responseCode = "404", description = "Dataset not found")
            })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteDataset(@PathVariable UUID id, Principal principal) {
        log.info("User {} attempting to delete dataset with ID: {}", principal.getName(), id);
        datasetService.deleteDataset(id, principal.getName());
        log.info("Dataset with ID {} deleted successfully by user {}", id, principal.getName());
        return ResponseEntity.noContent().build();
    }
}