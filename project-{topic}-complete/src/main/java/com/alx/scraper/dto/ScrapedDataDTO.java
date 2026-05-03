package com.alx.scraper.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ScrapedDataDTO {
    private Long id;
    private Long jobId;
    private String url;
    private Map<String, String> extractedData; // Key-value pairs of extracted info
    private LocalDateTime scrapedAt;
}