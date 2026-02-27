```java
package com.alx.webscraper.model.dto;

import com.alx.webscraper.model.DataField;
import com.alx.webscraper.model.ScrapingTaskStatus;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * DTO for updating an existing scraping task.
 * Allows partial updates.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTaskUpdateDTO {
    private String name;
    private String targetUrl;
    private List<DataField> dataFields;
    private ScrapingTaskStatus status;

    @Pattern(regexp = "^(|[0-9]{1,2} [0-9]{1,2} [0-9]{1,2} \\* \\* \\?)|(0 [0-5]?\\d(?: [0-5]?\\d){2}(?: 1?[0-2])? (?: [0-3]?\\d){2}(?: 1?[0-2])? [0-6]?\\d [0-6]?\\d(?: [0-9]{4})?)$",
             message = "Invalid cron expression format. Must be a valid 6 or 7 part cron, or empty.")
    private String cronExpression;
}
```