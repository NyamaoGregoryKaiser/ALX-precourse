package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.dto.evaluation.EvaluationRequestDTO;
import com.mlutil.ml_utilities_system.exception.InvalidDataException;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.util.DataProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluationService {

    private final DatasetService datasetService;
    private final DataProcessor dataProcessor; // DataProcessor contains static ML utility methods

    public Map<String, Double> evaluate(
            UUID datasetId, String ownerUsername, String trueLabelColumn, String predictionColumn,
            EvaluationRequestDTO.MetricType metricType) throws IOException {

        Dataset dataset = datasetService.getDatasetByIdAndOwner(datasetId, ownerUsername);
        Path datasetPath = Paths.get(dataset.getFilePath());

        // Load data from the CSV file
        List<Map<String, String>> data = dataProcessor.loadCsv(datasetPath);

        if (data.isEmpty()) {
            throw new InvalidDataException("Dataset is empty, cannot perform evaluation.");
        }

        // Extract true labels and predictions
        List<String> trueLabels = data.stream()
                .map(row -> row.get(trueLabelColumn))
                .filter(label -> label != null && !label.isEmpty())
                .collect(Collectors.toList());

        List<String> predictions = data.stream()
                .map(row -> row.get(predictionColumn))
                .filter(prediction -> prediction != null && !prediction.isEmpty())
                .collect(Collectors.toList());

        if (trueLabels.size() != predictions.size() || trueLabels.isEmpty()) {
            throw new InvalidDataException("True labels and predictions must be non-empty and have the same size.");
        }

        if (metricType == EvaluationRequestDTO.MetricType.CLASSIFICATION) {
            log.info("Calculating classification metrics for dataset {}", datasetId);
            return dataProcessor.calculateClassificationMetrics(trueLabels, predictions);
        } else if (metricType == EvaluationRequestDTO.MetricType.REGRESSION) {
            log.info("Calculating regression metrics for dataset {}", datasetId);
            // Convert to Double for regression metrics
            List<Double> trueLabelDoubles = trueLabels.stream()
                    .map(s -> {
                        try { return Double.parseDouble(s); }
                        catch (NumberFormatException e) { throw new InvalidDataException("Non-numeric value in true label column '" + trueLabelColumn + "' for regression evaluation."); }
                    })
                    .collect(Collectors.toList());
            List<Double> predictionDoubles = predictions.stream()
                    .map(s -> {
                        try { return Double.parseDouble(s); }
                        catch (NumberFormatException e) { throw new InvalidDataException("Non-numeric value in prediction column '" + predictionColumn + "' for regression evaluation."); }
                    })
                    .collect(Collectors.toList());
            return dataProcessor.calculateRegressionMetrics(trueLabelDoubles, predictionDoubles);
        } else {
            throw new InvalidDataException("Unsupported metric type: " + metricType);
        }
    }
}