```java
package com.alx.scrapineer.api.dto.scraping;

import com.alx.scrapineer.data.entity.JobStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingJobDto {
    private Long id;

    private Long targetId;
    private String targetName; // For display purposes

    private Long userId;

    private JobStatus status;

    // Optional: CRON expression for scheduling
    @Pattern(regexp = "^(|[0-9]{1,2} [0-9]{1,2} [0-9]{1,2} \\? \\* (MON|TUE|WED|THU|FRI|SAT|SUN|\\*)|[0-9]{1,2} [0-9]{1,2} [0-9]{1,2} [0-9]{1,2} [0-9]{1,2} \\?|@hourly|@daily|@weekly|@monthly|@yearly)$",
             message = "Invalid CRON expression format or predefined schedule. Examples: '0 0 * * * *' (every hour), '0 0 12 * * ?' (every day at noon). Empty string for manual jobs.")
    private String scheduleCron;

    private LocalDateTime lastRunAt;
    private LocalDateTime nextRunAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```