```java
package com.ml_utils_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for returning a prediction result.
 * Contains the prediction itself and potentially additional metadata.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponseDto {
    private String modelName;
    private String modelVersion;
    private String predictionResult; // The predicted value (e.g., "Positive", 0.75)
    private Map<String, Object> details; // Optional: confidence, probabilities, etc.
}
```