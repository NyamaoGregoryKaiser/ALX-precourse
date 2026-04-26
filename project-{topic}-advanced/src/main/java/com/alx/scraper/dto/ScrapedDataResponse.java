package com.alx.scraper.dto;

import com.alx.scraper.model.ScrapedData;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO for responding with {@link com.alx.scraper.model.ScrapedData} details.
 *
 * ALX Focus: Similar to `ScrapingJobResponse`, ensures a clean API contract for
 * scraped data.
 */
@Data
@Builder
public class ScrapedDataResponse {
    private Long id;
    private Long jobId;
    private String dataJson;
    private LocalDateTime scrapedAt;

    /**
     * Static factory method to create a ScrapedDataResponse from a ScrapedData entity.
     * @param data The {@link ScrapedData} entity.
     * @return A new {@link ScrapedDataResponse} instance.
     */
    public static ScrapedDataResponse fromEntity(ScrapedData data) {
        return ScrapedDataResponse.builder()
                .id(data.getId())
                .jobId(data.getScrapingJob().getId())
                .dataJson(data.getDataJson())
                .scrapedAt(data.getScrapedAt())
                .build();
    }
}