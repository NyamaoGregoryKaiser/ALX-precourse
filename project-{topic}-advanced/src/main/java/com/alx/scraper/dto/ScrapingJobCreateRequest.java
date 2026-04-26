package com.alx.scraper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for creating or updating a {@link com.alx.scraper.model.ScrapingJob}.
 * Encapsulates the necessary parameters for defining a new scraping task.
 *
 * ALX Focus: Robust validation of user input for creating scraping jobs,
 * including URL patterns and CRON expression validity (simple regex, more complex
 * validation could be a custom annotation).
 */
@Data
public class ScrapingJobCreateRequest {
    @NotBlank(message = "Job name is required")
    @Size(min = 3, max = 255, message = "Job name must be between 3 and 255 characters")
    private String name;

    @NotBlank(message = "Target URL is required")
    @Pattern(regexp = "^(https?|ftp|file)://[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]",
            message = "Invalid URL format")
    @Size(max = 2048, message = "Target URL exceeds maximum length")
    private String targetUrl;

    @NotBlank(message = "CSS selector is required")
    @Size(min = 1, max = 512, message = "CSS selector must be between 1 and 512 characters")
    private String cssSelector;

    // Optional: CRON expression for scheduling.
    // Basic pattern for common CRON expressions (6 parts).
    // More complex validation (e.g., checking actual CRON validity) might require a dedicated library.
    @Pattern(regexp = "^(?:\\*|(?:[0-5]?\\d(?:(?:-[0-5]?\\d)|(?:,[0-5]?\\d)+)?)) (?:\\*|(?:[0-5]?\\d(?:(?:-[0-5]?\\d)|(?:,[0-5]?\\d)+)?)) (?:\\*|(?:[01]?\\d|2[0-3])(?:(?:-[01]?\\d|2[0-3])|(?:,[01]?\\d|2[0-3])+)?)) (?:\\*|(?:[1-2]?\\d|3[01])(?:(?:-[1-2]?\\d|3[01])|(?:,[1-2]?\\d|3[01])+)?)) (?:\\*|(?:[1-9]|1[0-2])(?:(?:-[1-9]|1[0-2])|(?:,[1-9]|1[0-2])+)?)) (?:\\*|(?:[0-6])(?:(?:-[0-6])|(?:,[0-6])+)?))$",
            message = "Invalid CRON expression format. Example: '0 0 * * * *' (every hour at minute 0, second 0)",
            groups = { /* No specific group, applies always if present */ }
            , regexpFlags = { Pattern.Flag.DOTALL }
            , message = "Invalid CRON expression format. Please use 6 parts (second minute hour day-of-month month day-of-week). Example: '0 0 * * * *'"
    )
    private String scheduleCron;
}