package com.alx.scraper.dto;

import com.alx.scraper.entity.ScrapingStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ScrapingJobDTO {
    private Long id;
    private String jobName;
    private String targetUrl;
    private String description;
    private Map<String, String> selectors;
    private ScrapingStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Long userId; // Owner of the job
    private Integer maxPagesToScrape;
    private String nextPageSelector;
    private Integer pagesScrapedCount;
    private Long dataEntriesCount;
}