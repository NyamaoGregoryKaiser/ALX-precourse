```java
package com.alx.scrapineer.api.controller;

import com.alx.scrapineer.api.dto.scraping.ScrapingJobDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingResultDto;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.service.ScrapingJobService;
import com.alx.scrapineer.service.ScrapingResultService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Scraping Jobs", description = "Manage and execute web scraping jobs")
public class ScrapingJobController {

    private final ScrapingJobService jobService;
    private final ScrapingResultService resultService;

    @Operation(summary = "Get all scraping jobs for the authenticated user")
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ScrapingJobDto>> getAllJobs(@AuthenticationPrincipal User currentUser) {
        List<ScrapingJobDto> jobs = jobService.getAllJobs(currentUser);
        return ResponseEntity.ok(jobs);
    }

    @Operation(summary = "Get a scraping job by ID for the authenticated user")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingJobDto> getJobById(
            @Parameter(description = "ID of the job to retrieve", required = true) @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ScrapingJobDto job = jobService.getJobById(id, currentUser);
        return ResponseEntity.ok(job);
    }

    @Operation(summary = "Create a new scraping job")
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingJobDto> createJob(
            @Valid @RequestBody ScrapingJobDto jobDto,
            @AuthenticationPrincipal User currentUser) {
        ScrapingJobDto createdJob = jobService.createJob(jobDto, currentUser);
        return new ResponseEntity<>(createdJob, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing scraping job (e.g., change schedule)")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingJobDto> updateJob(
            @Parameter(description = "ID of the job to update", required = true) @PathVariable Long id,
            @Valid @RequestBody ScrapingJobDto jobDto,
            @AuthenticationPrincipal User currentUser) {
        ScrapingJobDto updatedJob = jobService.updateJob(id, jobDto, currentUser);
        return ResponseEntity.ok(updatedJob);
    }

    @Operation(summary = "Manually start a scraping job")
    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingJobDto> startJob(
            @Parameter(description = "ID of the job to start", required = true) @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ScrapingJobDto startedJob = jobService.startJob(id, currentUser);
        return ResponseEntity.ok(startedJob);
    }

    @Operation(summary = "Stop a running or scheduled scraping job")
    @PostMapping("/{id}/stop")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingJobDto> stopJob(
            @Parameter(description = "ID of the job to stop", required = true) @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ScrapingJobDto stoppedJob = jobService.stopJob(id, currentUser);
        return ResponseEntity.ok(stoppedJob);
    }

    @Operation(summary = "Get scraping results for a specific job")
    @GetMapping("/{jobId}/results")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Page<ScrapingResultDto>> getResultsForJob(
            @Parameter(description = "ID of the job to retrieve results for", required = true) @PathVariable Long jobId,
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ScrapingResultDto> results = resultService.getResultsForJob(jobId, currentUser, pageable);
        return ResponseEntity.ok(results);
    }

    @Operation(summary = "Get a specific scraping result by ID")
    @GetMapping("/results/{resultId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ScrapingResultDto> getResultById(
            @Parameter(description = "ID of the result to retrieve", required = true) @PathVariable Long resultId,
            @AuthenticationPrincipal User currentUser) {
        ScrapingResultDto result = resultService.getResultById(resultId, currentUser);
        return ResponseEntity.ok(result);
    }
}
```