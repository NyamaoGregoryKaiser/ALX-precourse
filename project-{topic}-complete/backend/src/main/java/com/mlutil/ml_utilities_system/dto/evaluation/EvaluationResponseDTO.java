package com.mlutil.ml_utilities_system.dto.evaluation;

import com.mlutil.ml_utilities_system.dto.evaluation.EvaluationRequestDTO.MetricType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResponseDTO {
    private UUID datasetId;
    private String trueLabelColumn;
    private String predictionColumn;
    private MetricType metricType;
    private Map<String, Double> metrics;
}