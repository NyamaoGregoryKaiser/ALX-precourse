```java
package com.ml.utilities.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionResponse {
    private String modelName;
    private String versionNumber;
    private Map<String, Object> prediction;
    private long inferenceTimeMillis;
}
```