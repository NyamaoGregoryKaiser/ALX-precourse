```java
package com.alx.pms.task.dto;

import com.alx.pms.model.TaskStatus;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.user.dto.UserResponse;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private ProjectResponse project; // Could be a simpler DTO to avoid recursion
    private UserResponse assignedTo;
    private TaskStatus status;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```