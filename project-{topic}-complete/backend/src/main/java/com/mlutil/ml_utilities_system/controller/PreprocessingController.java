package com.mlutil.ml_utilities_system.controller;

import com.mlutil.ml_utilities_system.dto.preprocessing.PreprocessingRequestDTO;
import com.mlutil.ml_utilities_system.dto.preprocessing.PreprocessingResponseDTO;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.service.PreprocessingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/preprocess")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Data Preprocessing", description = "API for applying various data preprocessing techniques")
public class PreprocessingController {

    private final PreprocessingService preprocessingService;

    @Operation(summary = "Apply preprocessing to a dataset and get the processed file",
            description = "Applies specified preprocessing steps (e.g., scaling, encoding, imputation) " +
                          "to a dataset and returns the processed dataset as a downloadable CSV.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Preprocessing successful, processed dataset returned"),
                    @ApiResponse(responseCode = "400", description = "Invalid request or preprocessing error"),
                    @ApiResponse(responseCode = "404", description = "Dataset not found")
            })
    @PostMapping(produces = "text/csv")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Resource> applyPreprocessing(
            @Valid @RequestBody PreprocessingRequestDTO requestDTO,
            Principal principal) throws IOException {
        log.info("User {} requesting preprocessing for dataset ID: {}", principal.getName(), requestDTO.getDatasetId());

        // Perform preprocessing and get the temporary processed file
        PreprocessingResponseDTO response = preprocessingService.applyPreprocessing(
                requestDTO.getDatasetId(),
                principal.getName(),
                requestDTO.getTransformations()
        );

        // Prepare the response for file download
        Resource resource = response.getProcessedFileResource();
        String originalFilename = response.getOriginalFilename();
        String processedFilename = "processed_" + originalFilename;

        log.info("Preprocessing completed for dataset ID {}. Returning file: {}", requestDTO.getDatasetId(), processedFilename);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + processedFilename + "\"")
                .body(resource);
    }
}