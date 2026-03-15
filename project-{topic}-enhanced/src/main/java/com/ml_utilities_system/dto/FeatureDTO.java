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
public class FeatureDTO {
    private Long id;

    @NotBlank(message = "Feature name cannot be blank")
    private String name;

    private String description;

    @NotBlank(message = "Feature type cannot be blank")
    private String type;

    @NotNull(message = "Version cannot be null")
    @Positive(message = "Version must be positive")
    private Integer version;

    @NotBlank(message = "Source dataset ID cannot be blank")
    private String sourceDatasetId;

    private String transformationLogic;

    private LocalDateTime createdAt;
    private LocalDateTime lastModifiedAt;
}