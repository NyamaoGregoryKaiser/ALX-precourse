package com.alx.scraper.controller;

import com.alx.scraper.dto.ScrapedDataResponse;
import com.alx.scraper.model.ScrapedData;
import com.alx.scraper.service.ScrapingJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST Controller for retrieving scraped data associated with a {@link com.alx.scraper.model.ScrapingJob}.
 *
 * ALX Focus: Demonstrates retrieving associated data, pagination for large datasets,
 * and securing access to data based on user ownership of the parent job.
 * Continues to use Swagger for API documentation.
 */
@RestController
@RequestMapping("/api/jobs/{jobId}/data")
@Tag(name = "Scraped Data", description = "Operations related to viewing scraped data for a specific job")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
public class ScrapedDataController {

    @Autowired
    private ScrapingJobService scrapingJobService;

    // A similar helper method as in ScrapingJobController, or better yet,
    // inject a UserDetailsResolver service or embed ID in JWT.
    private Long getUserIdFromUsername(String username) {
        // Placeholder, see note in ScrapingJobController
        return 1L; // Assume user ID 1 for authenticated user for this example.
    }

    /**
     * Retrieves scraped data for a specific job, with pagination.
     *
     * @param jobId The ID of the scraping job.
     * @param page The page number (0-indexed).
     * @param size The number of items per page.
     * @param sortBy The field to sort by (e.g., "scrapedAt").
     * @param sortDir The sort direction ("asc" or "desc").
     * @param authentication The Spring Security Authentication object.
     * @return A {@link ResponseEntity} with a paginated list of {@link ScrapedDataResponse}.
     */
    @Operation(summary = "Get paginated scraped data for a specific job",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Successfully retrieved scraped data",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = Page.class, subTypes = ScrapedDataResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT token"),
                   @ApiResponse(responseCode = "403", description = "Forbidden - Job not owned by user"),
                   @ApiResponse(responseCode = "404", description = "Job not found",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = GlobalExceptionHandler.ErrorResponse.class)))
               })
    @GetMapping
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<Page<ScrapedDataResponse>> getScrapedDataByJob(
            @Parameter(description = "ID of the scraping job") @PathVariable Long jobId,
            @Parameter(description = "Page number (0-indexed)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10")
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Field to sort by", example = "scrapedAt")
            @RequestParam(defaultValue = "scrapedAt") String sortBy,
            @Parameter(description = "Sort direction (asc or desc)", example = "desc")
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        Long userId = getUserIdFromUsername(((UserDetails) authentication.getPrincipal()).getUsername());

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ScrapedData> scrapedDataPage = scrapingJobService.getScrapedDataForJob(jobId, userId, pageable);

        log.debug("Retrieved page {} of scraped data for job {} by user {}", page, jobId, userId);
        return ResponseEntity.ok(scrapedDataPage.map(ScrapedDataResponse::fromEntity));
    }
}