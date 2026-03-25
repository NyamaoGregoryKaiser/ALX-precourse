```java
package com.alx.dataviz.dto;

import com.alx.dataviz.model.DataSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DataSourceDto {
    private Long id;

    @NotBlank(message = "Data source name cannot be empty")
    private String name;

    @NotBlank(message = "Connection details cannot be empty")
    private String connectionDetails;

    @NotNull(message = "Data source type cannot be null")
    private DataSource.DataSourceType type;

    private String schemaDefinition;
    private Long ownerId;
    private String ownerUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```