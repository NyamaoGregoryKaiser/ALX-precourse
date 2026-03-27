```java
package com.ml.utilities.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.Map;

@Data
public class PredictionRequest {
    @NotNull(message = "Input data cannot be null")
    private Map<String, Object> inputData;
}
```