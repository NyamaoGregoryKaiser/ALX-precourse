```java
package com.ml_utils_system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for transferring feature definition information.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeatureDefinitionDto {

    private Long id;

    @NotBlank(message = "Feature name cannot be empty")
    private String name;

    @NotBlank(message = "Feature type cannot be empty")
    private String type; // e.g., NUMERIC, CATEGORICAL, TEXT

    @NotBlank(message = "Feature version cannot be empty")
    private String version;

    private String description;

    private Long sourceDatasetId; // ID of the dataset this feature originates from (optional)

    private String transformationLogic;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
```