package com.alx.scrapingtools.scraper.controller;

import com.alx.scrapingtools.scraper.dto.ScraperConfigDTO;
import com.alx.scrapingtools.scraper.dto.ScrapingJobDTO;
import com.alx.scrapingtools.scraper.mapper.ScraperMapper;
import com.alx.scrapingtools.scraper.model.ScrapingJob;
import com.alx.scrapingtools.scraper.service.ScraperService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/scraper-configs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Scraper Configurations", description = "API for managing web scraper configurations")
@SecurityRequirement(name = "bearerAuth")
public class ScraperConfigController {

    private final ScraperService scraperService;
    private final ScraperMapper mapper;

    @Operation(summary = "Create a new scraper configuration",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Scraper configuration created successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = ScraperConfigDTO.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid input data"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden")
            })
    @PostMapping
    public ResponseEntity<ScraperConfigDTO> createScraperConfig(
            @Valid @RequestBody ScraperConfigDTO scraperConfigDTO,
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails) {

        UUID userId = scraperService.userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in database."))
                .getId();

        ScraperConfigDTO createdConfig = scraperService.createScraperConfig(scraperConfigDTO, userId);
        log.info("Scraper config created: {}", createdConfig.getName());
        return new ResponseEntity<>(createdConfig, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a scraper configuration by ID",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Scraper configuration found",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = ScraperConfigDTO.class))),
                    @ApiResponse(responseCode = "404", description = "Scraper configuration not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            })
    @GetMapping("/{id}")
    public ResponseEntity<ScraperConfigDTO> getScraperConfigById(
            @Parameter(description = "ID of the scraper configuration to retrieve", required = true)
            @PathVariable UUID id) {
        ScraperConfigDTO configDTO = scraperService.getScraperConfigById(id);
        return ResponseEntity.ok(configDTO);
    }

    @Operation(summary = "Get all scraper configurations",
            responses = {
                    @ApiResponse(responseCode = "200", description = "List of all scraper configurations",
                            content = @Content(mediaType = "application/json",
                                    array = @ArraySchema(schema = @Schema(implementation = ScraperConfigDTO.class)))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            })
    @GetMapping
    public ResponseEntity<List<ScraperConfigDTO>> getAllScraperConfigs() {
        List<ScraperConfigDTO> configs = scraperService.getAllScraperConfigs();
        return ResponseEntity.ok(configs);
    }

    @Operation(summary = "Update an existing scraper configuration",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Scraper configuration updated successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = ScraperConfigDTO.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid input data"),
                    @ApiResponse(responseCode = "404", description = "Scraper configuration not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden - User not owner or not admin")
            })
    @PutMapping("/{id}")
    public ResponseEntity<ScraperConfigDTO> updateScraperConfig(
            @Parameter(description = "ID of the scraper configuration to update", required = true)
            @PathVariable UUID id,
            @Valid @RequestBody ScraperConfigDTO scraperConfigDTO) {
        ScraperConfigDTO updatedConfig = scraperService.updateScraperConfig(id, scraperConfigDTO);
        log.info("Scraper config {} updated.", id);
        return ResponseEntity.ok(updatedConfig);
    }

    @Operation(summary = "Delete a scraper configuration by ID",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Scraper configuration deleted successfully"),
                    @ApiResponse(responseCode = "404", description = "Scraper configuration not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden - User not owner or not admin")
            })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScraperConfig(
            @Parameter(description = "ID of the scraper configuration to delete", required = true)
            @PathVariable UUID id) {
        scraperService.deleteScraperConfig(id);
        log.info("Scraper config {} deleted.", id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Manually trigger a scraping job for a configuration",
            responses = {
                    @ApiResponse(responseCode = "202", description = "Scraping job started",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = ScrapingJobDTO.class))),
                    @ApiResponse(responseCode = "404", description = "Scraper configuration not found"),
                    @ApiResponse(responseCode = "400", description = "Scraper configuration is not active"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            })
    @PostMapping("/{id}/start-job")
    public ResponseEntity<ScrapingJobDTO> startScrapingJob(
            @Parameter(description = "ID of the scraper configuration to start a job for", required = true)
            @PathVariable UUID id) {
        ScrapingJob job = scraperService.startScrapingJob(id);
        log.info("Manually triggered scraping job for config {}. Job ID: {}", id, job.getId());
        return new ResponseEntity<>(mapper.toDto(job), HttpStatus.ACCEPTED);
    }
}