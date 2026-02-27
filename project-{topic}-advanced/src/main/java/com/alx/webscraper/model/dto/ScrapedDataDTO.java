```java
package com.alx.webscraper.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for responding with scraped data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapedDataDTO {
    private UUID id;
    private UUID taskId;
    private Map<String, String> data;
    private LocalDateTime scrapedAt;
    private String sourceUrl;
}
```