```java
package com.ml_utils_system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for transferring ML Model information.
 * Used for model creation and retrieval.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModelDto {

    private Long id;

    @NotBlank(message = "Model name cannot be empty")
    private String name;

    private String description;

    @NotBlank(message = "Algorithm cannot be empty")
    private String algorithm;

    @NotBlank(message = "Target variable cannot be empty")
    private String targetVariable;

    private List<ModelVersionDto> versions; // List of associated model versions (optional, for detail view)

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
```