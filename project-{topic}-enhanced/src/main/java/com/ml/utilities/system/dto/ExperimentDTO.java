```java
package com.ml.utilities.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Data Transfer Object for ML Experiment details")
public class ExperimentDTO {

    @Schema(description = "Unique ID of the experiment", example = "1")
    private Long id;

    @NotBlank(message = "Experiment name cannot be empty")
    @Size(max = 255, message = "Experiment name cannot exceed 255 characters")
    @Schema(description = "Name of the experiment", example = "Customer Churn Prediction V2")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Schema(description = "Brief description of the experiment", example = "Predicting customer churn using XGBoost on aggregated telecom data.")
    private String description;

    @Schema(description = "Start date and time of the experiment", example = "2023-01-15T10:00:00")
    private LocalDateTime startDate;

    @Schema(description = "End date and time of the experiment", example = "2023-01-20T14:30:00")
    private LocalDateTime endDate;

    @NotBlank(message = "Status cannot be empty")
    @Size(max = 50, message = "Status cannot exceed 50 characters")
    @Schema(description = "Current status of the experiment", example = "RUNNING", allowableValues = {"PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"})
    private String status;

    @Size(max = 1000, message = "Objective cannot exceed 1000 characters")
    @Schema(description = "Objective of the experiment", example = "Achieve F1-score > 0.85 and reduce false positives by 10%.")
    private String objective;

    @Schema(description = "Timestamp when the experiment was created", example = "2023-01-14T09:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the experiment was last updated", example = "2023-01-20T14:35:00")
    private LocalDateTime updatedAt;

    @Schema(description = "ID of the user who created the experiment", example = "101")
    private Long createdByUserId;
}
```