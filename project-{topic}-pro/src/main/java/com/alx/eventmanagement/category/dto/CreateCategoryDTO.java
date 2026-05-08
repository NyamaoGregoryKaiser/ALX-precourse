```java
package com.alx.eventmanagement.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCategoryDTO {
    @NotBlank(message = "Category name cannot be empty")
    @Size(min = 2, max = 100, message = "Category name must be between 2 and 100 characters")
    private String name;

    @Size(max = 255, message = "Category description cannot exceed 255 characters")
    private String description;
}
```