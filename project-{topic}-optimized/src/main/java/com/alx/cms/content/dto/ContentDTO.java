```java
package com.alx.cms.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContentDTO {
    private Long id;

    @NotBlank(message = "Title cannot be empty")
    @Size(min = 5, max = 255, message = "Title must be between 5 and 255 characters")
    private String title;

    private String slug; // Will be generated if not provided, or validated if provided

    @NotBlank(message = "Body cannot be empty")
    private String body;

    private LocalDateTime publishedAt;
    private boolean published;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @NotNull(message = "Author ID cannot be null")
    private Long authorId;

    private Long categoryId;
    private Set<Long> tagIds;
}
```