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
@Schema(description = "Data Transfer Object for ML Feature Set details")
public class FeatureSetDTO {

    @Schema(description = "Unique ID of the feature set", example = "1")
    private Long id;

    @NotBlank(message = "Feature set name cannot be empty")
    @Size(max = 255, message = "Feature set name cannot exceed 255 characters")
    @Schema(description = "Name of the feature set", example = "Telecom Churn Engineered Features")
    private String name;

    @NotBlank(message = "Feature set version cannot be empty")
    @Size(max = 50, message = "Feature set version cannot exceed 50 characters")
    @Schema(description = "Version of the feature set", example = "1.0.0")
    private String version;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Schema(description = "Brief description of the feature set", example = "Features derived from raw telecom data, including call duration aggregates and data usage patterns.")
    private String description;

    @Schema(description = "ID of the source dataset from which features were derived", example = "101")
    private Long sourceDatasetId;

    @Size(max = 1000, message = "Transformation code URI cannot exceed 1000 characters")
    @Schema(description = "URI to the code or notebook used for feature transformation", example = "github.com/myorg/feature-engineering/churn_features.ipynb")
    private String transformationCodeUri;

    @Schema(description = "Timestamp when the feature set was created", example = "2023-01-12T11:30:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the feature set was last updated", example = "2023-01-12T11:30:00")
    private LocalDateTime updatedAt;

    @Schema(description = "ID of the user who created the feature set", example = "101")
    private Long createdByUserId;
}
```