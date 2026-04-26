package com.alx.scraper.dto;

import com.alx.scraper.model.ScrapingJob;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO for responding with {@link com.alx.scraper.model.ScrapingJob} details.
 * Provides a clean and controlled representation of job data to the client.
 *
 * ALX Focus: Demonstrates transformation from internal model to external API representation,
 * hiding sensitive details or restructuring for client consumption. Using `@Builder` for
 * easier construction of complex DTOs.
 */
@Data
@Builder
public class ScrapingJobResponse {
    private Long id;
    private String name;
    private String targetUrl;
    private String cssSelector;
    private String scheduleCron;
    private ScrapingJob.JobStatus status;
    private LocalDateTime lastRunAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long userId; // Include user ID to show ownership

    /**
     * Static factory method to create a ScrapingJobResponse from a ScrapingJob entity.
     * This decouples the DTO from the entity and provides a clean conversion.
     * @param job The {@link ScrapingJob} entity.
     * @return A new {@link ScrapingJobResponse} instance.
     */
    public static ScrapingJobResponse fromEntity(ScrapingJob job) {
        return ScrapingJobResponse.builder()
                .id(job.getId())
                .name(job.getName())
                .targetUrl(job.getTargetUrl())
                .cssSelector(job.getCssSelector())
                .scheduleCron(job.getScheduleCron())
                .status(job.getStatus())
                .lastRunAt(job.getLastRunAt())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .userId(job.getUser().getId())
                .build();
    }
}