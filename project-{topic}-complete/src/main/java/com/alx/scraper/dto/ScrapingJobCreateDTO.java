package com.alx.scraper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ScrapingJobCreateDTO {
    @NotBlank(message = "Job name is required")
    private String jobName;

    @NotBlank(message = "Target URL is required")
    @Pattern(regexp = "^(http|https)://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[a-zA-Z0-9_.-]*)*(\\?[a-zA-Z0-9_=&-]*)?(#[a-zA-Z0-9_]*)?$",
            message = "Invalid URL format")
    private String targetUrl;

    private String description;

    // A map where key is the field name (e.g., "productTitle") and value is the CSS selector
    @NotNull(message = "Selectors are required")
    private Map<String, String> selectors;

    private Integer maxPagesToScrape;
    private String nextPageSelector; // CSS selector for the 'next page' link
}