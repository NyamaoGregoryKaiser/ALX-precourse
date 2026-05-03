package com.alx.scraper.controller;

import com.alx.scraper.dto.ScrapingJobCreateDTO;
import com.alx.scraper.dto.ScrapingJobDTO;
import com.alx.scraper.service.ScrapingJobService;
import com.alx.scraper.util.RateLimitInterceptor; // For demonstrating rate limiting, though applied at filter level
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@Tag(name = "Scraping Job Management", description = "APIs for creating, managing, and viewing web scraping jobs.")
@SecurityRequirement(name = "bearerAuth") // Applies to all methods in this controller
public class ScrapingJobController {

    private final ScrapingJobService scrapingJobService;

    @Operation(summary = "Create a new scraping job",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Scraping job created successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER role")
               })
    @PreAuthorize("hasRole('USER')")
    @PostMapping
    public ResponseEntity<ScrapingJobDTO> createJob(@Valid @RequestBody ScrapingJobCreateDTO createDTO) {
        ScrapingJobDTO job = scrapingJobService.createScrapingJob(createDTO);
        return new ResponseEntity<>(job, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a scraping job by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Job found"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER or ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<ScrapingJobDTO> getJobById(@Parameter(description = "ID of the scraping job") @PathVariable Long id) {
        ScrapingJobDTO job = scrapingJobService.getScrapingJobById(id);
        return ResponseEntity.ok(job);
    }

    @Operation(summary = "Get all scraping jobs for the authenticated user",
               responses = {
                   @ApiResponse(responseCode = "200", description = "List of jobs"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER or ADMIN role")
               })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<List<ScrapingJobDTO>> getAllJobs() {
        List<ScrapingJobDTO> jobs = scrapingJobService.getAllScrapingJobs();
        return ResponseEntity.ok(jobs);
    }

    @Operation(summary = "Update an existing scraping job",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Job updated successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasRole('USER')")
    @PutMapping("/{id}")
    public ResponseEntity<ScrapingJobDTO> updateJob(@Parameter(description = "ID of the scraping job to update") @PathVariable Long id,
                                                    @Valid @RequestBody ScrapingJobCreateDTO updateDTO) {
        ScrapingJobDTO job = scrapingJobService.updateScrapingJob(id, updateDTO);
        return ResponseEntity.ok(job);
    }

    @Operation(summary = "Delete a scraping job by ID",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Job deleted successfully"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@Parameter(description = "ID of the scraping job to delete") @PathVariable Long id) {
        scrapingJobService.deleteScrapingJob(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @Operation(summary = "Start a scraping job by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Job started successfully"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasRole('USER')")
    @PostMapping("/{id}/start")
    public ResponseEntity<ScrapingJobDTO> startJob(@Parameter(description = "ID of the scraping job to start") @PathVariable Long id) {
        ScrapingJobDTO job = scrapingJobService.startScrapingJob(id);
        return ResponseEntity.ok(job);
    }

    @Operation(summary = "Stop a running scraping job by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Job stopped successfully"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasRole('USER')")
    @PostMapping("/{id}/stop")
    public ResponseEntity<ScrapingJobDTO> stopJob(@Parameter(description = "ID of the scraping job to stop") @PathVariable Long id) {
        ScrapingJobDTO job = scrapingJobService.stopScrapingJob(id);
        return ResponseEntity.ok(job);
    }
}