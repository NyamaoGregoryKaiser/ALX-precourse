```java
package com.ml.utilities.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelVersionDTO {
    private Long id;
    private Long modelId;
    @NotBlank(message = "Version number cannot be empty")
    private String versionNumber;
    @NotBlank(message = "Model path cannot be empty")
    private String modelPath;
    private String metadata;
    private boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```