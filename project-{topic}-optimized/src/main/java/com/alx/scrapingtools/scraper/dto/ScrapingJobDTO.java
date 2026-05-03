package com.alx.scrapingtools.scraper.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO for Scraping Job details")
public class ScrapingJobDTO {
    @Schema(description = "Unique identifier of the scraping job", example = "a1b2c3d4-e5f6-7890-1234-567890abcdef")
    private UUID id;

    @Schema(description = "ID of the associated scraper configuration", example = "b2c3d4e5-f6a7-8901-2345-67890abcdeff")
    private UUID scraperConfigId;

    @Schema(description = "Name of the associated scraper configuration", example = "Tech News Scraper")
    private String scraperConfigName;

    @Schema(description = "Timestamp when the scraping job started")
    private OffsetDateTime startTime;

    @Schema(description = "Timestamp when the scraping job ended")
    private OffsetDateTime endTime;

    @Schema(description = "Current status of the scraping job (e.g., PENDING, RUNNING, COMPLETED, FAILED)", example = "COMPLETED")
    private String status;

    @Schema(description = "Error message if the scraping job failed")
    private String errorMessage;

    @Schema(description = "Number of items successfully scraped during this job", example = "150")
    private Integer itemsScraped;
}