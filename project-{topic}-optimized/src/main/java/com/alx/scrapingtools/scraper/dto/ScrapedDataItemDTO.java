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
@Schema(description = "DTO for Scraped Data Item details")
public class ScrapedDataItemDTO {
    @Schema(description = "Unique identifier of the scraped data item", example = "c3d4e5f6-a7b8-9012-3456-7890abcdef12")
    private UUID id;

    @Schema(description = "ID of the scraping job that produced this item", example = "a1b2c3d4-e5f6-7890-1234-567890abcdef")
    private UUID scrapingJobId;

    @Schema(description = "ID of the scraper configuration used for this item", example = "b2c3d4e5-f6a7-8901-2345-67890abcdeff")
    private UUID scraperConfigId;

    @Schema(description = "Title of the scraped item")
    private String title;

    @Schema(description = "Description or summary of the scraped item")
    private String description;

    @Schema(description = "URL of the scraped item")
    private String url;

    @Schema(description = "Full content of the scraped item if applicable")
    private String content;

    @Schema(description = "Timestamp when the item was scraped")
    private OffsetDateTime scrapedAt;
}