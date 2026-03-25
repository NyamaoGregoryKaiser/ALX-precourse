```java
package com.alx.dataviz.dto;

import com.alx.dataviz.model.Chart;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChartDto {
    private Long id;

    @NotBlank(message = "Chart title cannot be empty")
    private String title;

    private String description;

    @NotNull(message = "Chart type cannot be null")
    private Chart.ChartType type;

    @NotNull(message = "Data source ID cannot be null")
    private Long dataSourceId;
    private String dataSourceName;

    @NotNull(message = "Dashboard ID cannot be null")
    private Long dashboardId;
    private String dashboardName;

    private String configuration; // JSON string for chart config
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```