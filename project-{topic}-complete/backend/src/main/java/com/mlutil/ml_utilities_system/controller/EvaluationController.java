package com.mlutil.ml_utilities_system.controller;

import com.mlutil.ml_utilities_system.dto.evaluation.EvaluationRequestDTO;
import com.mlutil.ml_utilities_system.dto.evaluation.EvaluationResponseDTO;
import com.mlutil.ml_utilities_system.service.EvaluationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/evaluate")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Model Evaluation", description = "API for evaluating machine learning model predictions")
public class EvaluationController {

    private final EvaluationService evaluationService;

    @Operation(summary = "Evaluate model predictions against true labels",
            description = "Takes a dataset ID, columns for true labels and predictions, and the type of metric to calculate.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Evaluation successful, metrics returned"),
                    @ApiResponse(responseCode = "400", description = "Invalid request or data issues"),
                    @ApiResponse(responseCode = "404", description = "Dataset not found")
            })
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<EvaluationResponseDTO> evaluateModel(
            @Valid @RequestBody EvaluationRequestDTO requestDTO,
            Principal principal) throws IOException {
        log.info("User {} requesting evaluation for dataset ID: {}", principal.getName(), requestDTO.getDatasetId());

        UUID datasetId = requestDTO.getDatasetId();
        String trueLabelColumn = requestDTO.getTrueLabelColumn();
        String predictionColumn = requestDTO.getPredictionColumn();
        EvaluationRequestDTO.MetricType metricType = requestDTO.getMetricType();

        Map<String, Double> metrics = evaluationService.evaluate(
                datasetId, principal.getName(), trueLabelColumn, predictionColumn, metricType
        );

        EvaluationResponseDTO response = EvaluationResponseDTO.builder()
                .datasetId(datasetId)
                .trueLabelColumn(trueLabelColumn)
                .predictionColumn(predictionColumn)
                .metricType(metricType)
                .metrics(metrics)
                .build();

        log.info("Evaluation completed for dataset ID {}: {}", datasetId, metrics);
        return ResponseEntity.ok(response);
    }
}