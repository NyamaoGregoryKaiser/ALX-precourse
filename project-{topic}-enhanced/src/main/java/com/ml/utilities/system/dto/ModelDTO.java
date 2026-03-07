```java
package com.ml.utilities.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Data Transfer Object for ML Model details")
public class ModelDTO {

    @Schema(description = "Unique ID of the model", example = "1")
    private Long id;

    @NotBlank(message = "Model name cannot be empty")
    @Size(max = 255, message = "Model name cannot exceed 255 characters")
    @Schema(description = "Name of the model", example = "XGBoost Churn Predictor")
    private String name;

    @NotBlank(message = "Model version cannot be empty")
    @Size(max = 50, message = "Model version cannot exceed 50 characters")
    @Schema(description = "Version of the model", example = "1.0.1")
    private String version;

    @Schema(description = "ID of the experiment associated with this model", example = "101")
    private Long experimentId;

    @Schema(description = "ID of the dataset used to train this model", example = "201")
    private Long datasetId;

    @Schema(description = "ID of the feature set used by this model", example = "301")
    private Long featureSetId;

    @Size(max = 1000, message = "Model URI cannot exceed 1000 characters")
    @Schema(description = "URI where the model artifact is stored (e.g., S3 path, local path)", example = "s3://my-ml-bucket/models/churn/xgboost_v1.0.1.pkl")
    private String modelUri;

    @Size(max = 100, message = "Framework name cannot exceed 100 characters")
    @Schema(description = "ML framework used (e.g., Scikit-learn, TensorFlow, PyTorch)", example = "XGBoost")
    private String framework;

    @DecimalMin(value = "0.0", message = "Accuracy must be non-negative")
    @DecimalMax(value = "1.0", message = "Accuracy cannot exceed 1.0")
    @Schema(description = "Accuracy score of the model", example = "0.8850")
    private BigDecimal accuracy;

    @DecimalMin(value = "0.0", message = "F1-score must be non-negative")
    @DecimalMax(value = "1.0", message = "F1-score cannot exceed 1.0")
    @Schema(description = "F1-score of the model", example = "0.8210")
    private BigDecimal f1Score;

    @DecimalMin(value = "0.0", message = "Precision score must be non-negative")
    @DecimalMax(value = "1.0", message = "Precision score cannot exceed 1.0")
    @Schema(description = "Precision score of the model", example = "0.8500")
    private BigDecimal precisionScore;

    @DecimalMin(value = "0.0", message = "Recall score must be non-negative")
    @DecimalMax(value = "1.0", message = "Recall score cannot exceed 1.0")
    @Schema(description = "Recall score of the model", example = "0.7940")
    private BigDecimal recallScore;

    @Schema(description = "Timestamp when the model was created", example = "2023-01-20T15:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the model was last updated", example = "2023-01-20T15:00:00")
    private LocalDateTime updatedAt;

    @Schema(description = "ID of the user who registered the model", example = "101")
    private Long createdByUserId;
}
```