package com.ml_utilities_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DatasetDTO {
    private Long id;

    @NotBlank(message = "Dataset name cannot be blank")
    private String name;

    private String description;

    @NotBlank(message = "File path cannot be blank")
    private String filePath;

    @NotNull(message = "Size in bytes cannot be null")
    @Positive(message = "Size in bytes must be positive")
    private Long sizeBytes;

    @NotBlank(message = "Format cannot be blank")
    private String format;

    private LocalDateTime uploadedAt;
    private LocalDateTime lastModifiedAt;
}