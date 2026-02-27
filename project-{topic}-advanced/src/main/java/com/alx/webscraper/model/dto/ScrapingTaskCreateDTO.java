```java
package com.alx.webscraper.model.dto;

import com.alx.webscraper.model.DataField;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * DTO for creating a new scraping task.
 * Contains validation annotations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTaskCreateDTO {

    @NotBlank(message = "Task name cannot be empty")
    private String name;

    @NotBlank(message = "Target URL cannot be empty")
    @Pattern(regexp = "^(http|https)://.*$", message = "Target URL must be a valid http(s) URL")
    private String targetUrl;

    @NotNull(message = "Data fields cannot be null")
    private List<DataField> dataFields;

    @Pattern(regexp = "^(|[0-9]{1,2} [0-9]{1,2} [0-9]{1,2} \\* \\* \\?)|(0 [0-5]?\\d(?: [0-5]?\\d){2}(?: 1?[0-2])? (?: [0-3]?\\d){2}(?: 1?[0-2])? [0-6]?\\d [0-6]?\\d(?: [0-9]{4})?)$",
             message = "Invalid cron expression format. Must be a valid 6 or 7 part cron, or empty.")
    private String cronExpression; // Optional CRON expression
}
```