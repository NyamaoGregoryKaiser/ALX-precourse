package com.ml_utilities_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ModelDTO {
    private Long id;

    @NotBlank(message = "Model name cannot be blank")
    private String name;

    private String description;

    @NotNull(message = "Version cannot be null")
    @Positive(message = "Version must be positive")
    private Integer version;

    @NotBlank(message = "Algorithm cannot be blank")
    private String algorithm;

    private String modelPath;

    private Double performanceMetric;

    @NotBlank(message = "Status cannot be blank")
    private String status;

    private Set<Long> featureIds; // IDs of features used by this model
    private Long trainingDatasetId; // ID of the dataset used for training

    private LocalDateTime registeredAt;
    private LocalDateTime lastModifiedAt;
}