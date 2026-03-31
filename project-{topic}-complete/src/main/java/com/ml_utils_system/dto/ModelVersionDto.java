```java
package com.ml_utils_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO for transferring ML Model Version information.
 * Used for model version creation, update, and retrieval.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModelVersionDto {

    private Long id;

    @NotNull(message = "Model ID cannot be null")
    private Long modelId;

    @NotBlank(message = "Version number cannot be empty")
    private String versionNumber;

    private String artifactPath;

    private String trainingMetrics; // JSON string

    private String deploymentStatus; // e.g., "Production", "Staging", "Development"

    private LocalDateTime deployedAt;

    private Set<Long> featureIds; // IDs of features used by this model version

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
```