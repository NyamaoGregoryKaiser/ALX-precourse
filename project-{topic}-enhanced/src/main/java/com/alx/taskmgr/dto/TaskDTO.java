```java
package com.alx.taskmgr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private Long id;

    @NotBlank(message = "Task title cannot be blank")
    @Size(min = 3, max = 255, message = "Task title must be between 3 and 255 characters")
    private String title;

    private String description;

    private LocalDate dueDate;

    private boolean completed;

    private Long userId; // For internal use, not exposed in API usually

    private Long categoryId; // Optional category association
    private String categoryName; // To display category name in response
}
```