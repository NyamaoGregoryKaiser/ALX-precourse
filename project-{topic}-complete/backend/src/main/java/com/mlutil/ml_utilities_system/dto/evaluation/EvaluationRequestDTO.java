package com.mlutil.ml_utilities_system.dto.evaluation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationRequestDTO {

    public enum MetricType {
        CLASSIFICATION,
        REGRESSION
    }

    @NotNull(message = "Dataset ID is required")
    private UUID datasetId;

    @NotBlank(message = "True label column name is required")
    private String trueLabelColumn;

    @NotBlank(message = "Prediction column name is required")
    private String predictionColumn;

    @NotNull(message = "Metric type (CLASSIFICATION or REGRESSION) is required")
    private MetricType metricType;
}