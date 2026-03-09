```java
package com.alx.pms.task.dto;

import com.alx.pms.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Data
public class TaskRequest {
    @NotBlank(message = "Task title cannot be empty")
    @Size(min = 3, max = 200, message = "Task title must be between 3 and 200 characters")
    private String title;

    @Size(max = 1000, message = "Task description cannot exceed 1000 characters")
    private String description;

    private Long assignedToUserId;

    private TaskStatus status; // Can be null, default will be set in entity

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dueDate;
}
```