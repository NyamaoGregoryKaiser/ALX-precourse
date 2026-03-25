```java
package com.alx.dataviz.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class DashboardDto {
    private Long id;

    @NotBlank(message = "Dashboard name cannot be empty")
    private String name;

    private String description;
    private Long ownerId;
    private String ownerUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ChartDto> charts; // Optional: include charts
}
```