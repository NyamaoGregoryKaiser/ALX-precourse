package com.alx.scraper.controller;

import com.alx.scraper.dto.ScrapedDataDTO;
import com.alx.scraper.service.ScrapingJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/scraped-data")
@RequiredArgsConstructor
@Tag(name = "Scraped Data Retrieval", description = "APIs for accessing scraped data.")
@SecurityRequirement(name = "bearerAuth")
public class ScrapedDataController {

    private final ScrapingJobService scrapingJobService;

    @Operation(summary = "Get all scraped data for a specific scraping job",
               responses = {
                   @ApiResponse(responseCode = "200", description = "List of scraped data entries"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER or ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "Job not found")
               })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ScrapedDataDTO>> getScrapedDataForJob(@Parameter(description = "ID of the scraping job") @PathVariable Long jobId) {
        List<ScrapedDataDTO> data = scrapingJobService.getScrapedDataForJob(jobId);
        return ResponseEntity.ok(data);
    }

    @Operation(summary = "Get a specific scraped data entry by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Scraped data entry found"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - requires USER or ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "Scraped data not found")
               })
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<ScrapedDataDTO> getScrapedDataById(@Parameter(description = "ID of the scraped data entry") @PathVariable Long id) {
        ScrapedDataDTO data = scrapingJobService.getScrapedDataById(id);
        return ResponseEntity.ok(data);
    }
}