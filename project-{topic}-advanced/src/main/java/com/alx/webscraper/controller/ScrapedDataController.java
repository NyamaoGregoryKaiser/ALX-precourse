```java
package com.alx.webscraper.controller;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.model.dto.ScrapedDataDTO;
import com.alx.webscraper.service.ScrapingTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for accessing scraped data.
 * Provides endpoints to retrieve data associated with a specific scraping task.
 */
@RestController
@RequestMapping("/api/v1/tasks/{taskId}/data")
@Tag(name = "Scraped Data", description = "API for retrieving scraped data associated with tasks")
@SecurityRequirement(name = "bearerAuth") // Requires JWT authentication
public class ScrapedDataController {

    private final ScrapingTaskService scrapingTaskService;

    public ScrapedDataController(ScrapingTaskService scrapingTaskService) {
        this.scrapingTaskService = scrapingTaskService;
    }

    /**
     * Retrieves paginated scraped data entries for a specific scraping task.
     *
     * @param taskId   The ID of the scraping task.
     * @param user     The authenticated user (to verify task ownership).
     * @param pageable Pagination and sorting parameters (e.g., ?page=0&size=10&sort=scrapedAt,desc).
     * @return A ResponseEntity containing a page of ScrapedDataDTOs.
     */
    @GetMapping
    @Operation(summary = "Get paginated scraped data for a specific task",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Scraped data retrieved successfully",
                                content = @Content(schema = @Schema(implementation = Page.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden"),
                   @ApiResponse(responseCode = "404", description = "Scraping task not found")
               })
    public ResponseEntity<Page<ScrapedDataDTO>> getScrapedDataForTask(
            @PathVariable UUID taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal User user,
            @PageableDefault(size = 20, sort = "scrapedAt") Pageable pageable) {
        Page<ScrapedDataDTO> scrapedData = scrapingTaskService.getScrapedDataForTask(taskId, user, pageable);
        return ResponseEntity.ok(scrapedData);
    }
}
```