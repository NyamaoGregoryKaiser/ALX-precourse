package com.alx.scrapingtools.scraper.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
@Schema(description = "DTO for Scraper Configuration details")
public class ScraperConfigDTO {
    @Schema(description = "Unique identifier of the scraper configuration", example = "a1b2c3d4-e5f6-7890-1234-567890abcdef")
    private UUID id;

    @NotBlank(message = "Scraper name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    @Schema(description = "Name of the scraper configuration", example = "Tech News Scraper")
    private String name;

    @NotBlank(message = "Start URL is required")
    @Schema(description = "The initial URL to start scraping from", example = "https://www.example.com/tech-news")
    private String startUrl;

    @NotBlank(message = "Target CSS selector is required")
    @Schema(description = "CSS selector to identify individual items to be scraped", example = ".article-card")
    private String cssSelectorTarget;

    @Schema(description = "CSS selector for the title within each target item", example = ".article-title a")
    private String cssSelectorTitle;

    @Schema(description = "CSS selector for the description within each target item", example = ".article-summary")
    private String cssSelectorDescription;

    @Schema(description = "CSS selector for the link within each target item", example = ".article-link")
    private String cssSelectorLink;

    @NotNull(message = "Scrape interval in minutes is required")
    @Min(value = 5, message = "Scrape interval must be at least 5 minutes")
    @Schema(description = "Interval in minutes for how often the scraper should run", example = "60")
    private Integer scrapeIntervalMinutes;

    @Schema(description = "Timestamp of the last time the scraper ran successfully")
    private OffsetDateTime lastRunTime;

    @Schema(description = "Whether the scraper is active or not", example = "true")
    private Boolean isActive;

    @Schema(description = "ID of the user who created this scraper configuration")
    private UUID createdByUserId;

    @Schema(description = "Timestamp when the scraper configuration was created")
    private OffsetDateTime createdAt;

    @Schema(description = "Timestamp when the scraper configuration was last updated")
    private OffsetDateTime updatedAt;
}