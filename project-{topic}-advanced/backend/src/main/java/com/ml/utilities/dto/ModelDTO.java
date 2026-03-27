```java
package com.ml.utilities.dto;

import com.ml.utilities.entity.ModelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelDTO {
    private Long id;
    @NotBlank(message = "Model name cannot be empty")
    private String name;
    private String description;
    @NotNull(message = "Model type cannot be null")
    private ModelType type;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ModelVersionDTO> versions; // Optional, only for detailed view
}
```