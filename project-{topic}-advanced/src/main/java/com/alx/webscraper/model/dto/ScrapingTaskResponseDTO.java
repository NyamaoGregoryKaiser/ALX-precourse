```java
package com.alx.webscraper.model.dto;

import com.alx.webscraper.model.DataField;
import com.alx.webscraper.model.ScrapingTaskStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for responding with scraping task details,
 * hiding sensitive information and structuring data for clients.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTaskResponseDTO {
    private UUID id;
    private String name;
    private String targetUrl;
    private List<DataField> dataFields;
    private ScrapingTaskStatus status;
    private String cronExpression;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastRunAt;
    private String lastRunMessage;
    private UUID userId; // Expose user ID, not the full user object
}
```