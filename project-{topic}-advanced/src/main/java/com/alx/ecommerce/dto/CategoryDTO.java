```java
package com.alx.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CategoryDTO {
    private Long id;

    @NotBlank(message = "Category name cannot be empty")
    @Size(min = 3, max = 255, message = "Category name must be between 3 and 255 characters")
    private String name;

    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```