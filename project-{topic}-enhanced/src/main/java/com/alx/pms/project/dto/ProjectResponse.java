```java
package com.alx.pms.project.dto;

import com.alx.pms.user.dto.UserResponse;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private UserResponse owner;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```