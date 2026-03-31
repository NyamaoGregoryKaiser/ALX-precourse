```java
package com.ml_utils_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for transferring dataset information between the client and server.
 * Used for both request and response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetDto {

    private Long id;

    @NotBlank(message = "Dataset name cannot be empty")
    private String name;

    private String description;

    @NotBlank(message = "Storage path cannot be empty")
    private String storagePath;

    @NotBlank(message = "File type cannot be empty")
    private String fileType;

    @NotNull(message = "Size in bytes cannot be null")
    private Long sizeBytes;

    private Integer numRows;

    private Integer numColumns;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
```