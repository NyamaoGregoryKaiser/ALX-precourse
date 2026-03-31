```java
package com.ml_utils_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for requesting a prediction from a specific model version.
 * Contains the model name, version, and input features as a map.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequestDto {

    @NotBlank(message = "Model name cannot be empty")
    private String modelName;

    @NotBlank(message = "Model version cannot be empty")
    private String modelVersion;

    @NotNull(message = "Input features cannot be null")
    private Map<String, Object> inputFeatures; // Map of feature name to value
}
```