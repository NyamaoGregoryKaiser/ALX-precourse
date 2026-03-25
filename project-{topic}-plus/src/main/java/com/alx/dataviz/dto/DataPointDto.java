```java
package com.alx.dataviz.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataPointDto {
    private Map<String, Object> data; // Represents a row of data, e.g., {"category": "A", "value": 10}
}
```