package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.dto.preprocessing.PreprocessingRequestDTO;
import com.mlutil.ml_utilities_system.dto.preprocessing.PreprocessingResponseDTO;
import com.mlutil.ml_utilities_system.exception.InvalidDataException;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.util.DataProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PreprocessingService {

    @Value("${application.dataset.temp-dir}")
    private String tempDir;

    private final DatasetService datasetService;
    private final DataProcessor dataProcessor; // DataProcessor contains static ML utility methods

    private Path getTempPath() {
        Path path = Paths.get(tempDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new RuntimeException("Could not create temporary directory!", e);
        }
        return path;
    }

    public PreprocessingResponseDTO applyPreprocessing(
            UUID datasetId, String ownerUsername, List<PreprocessingRequestDTO.Transformation> transformations) throws IOException {

        Dataset dataset = datasetService.getDatasetByIdAndOwner(datasetId, ownerUsername);
        Path originalDatasetPath = Paths.get(dataset.getFilePath());

        // Load data from the CSV file
        List<Map<String, String>> data = dataProcessor.loadCsv(originalDatasetPath);

        if (data.isEmpty()) {
            throw new InvalidDataException("Dataset is empty, cannot perform preprocessing.");
        }

        // Apply transformations sequentially
        for (PreprocessingRequestDTO.Transformation transformation : transformations) {
            log.info("Applying transformation {} to columns {} for dataset {}",
                    transformation.getType(), transformation.getColumns(), datasetId);
            switch (transformation.getType()) {
                case MIN_MAX_SCALING ->
                        data = dataProcessor.minMaxScale(data, transformation.getColumns());
                case STANDARD_SCALING ->
                        data = dataProcessor.standardScale(data, transformation.getColumns());
                case ONE_HOT_ENCODING ->
                        data = dataProcessor.oneHotEncode(data, transformation.getColumns());
                case MEAN_IMPUTATION ->
                        data = dataProcessor.imputeMissing(data, transformation.getColumns(), DataProcessor.ImputationStrategy.MEAN);
                case MEDIAN_IMPUTATION ->
                        data = dataProcessor.imputeMissing(data, transformation.getColumns(), DataProcessor.ImputationStrategy.MEDIAN);
                default -> throw new InvalidDataException("Unsupported transformation type: " + transformation.getType());
            }
        }

        // Save the processed data to a temporary file
        String tempFilename = "processed_" + UUID.randomUUID() + "_" + dataset.getFilename();
        Path tempFilePath = getTempPath().resolve(tempFilename);
        dataProcessor.writeCsv(data, tempFilePath);
        log.info("Processed data saved temporarily to: {}", tempFilePath.toString());

        // Create a FileSystemResource for the temporary file
        FileSystemResource resource = new FileSystemResource(tempFilePath.toFile());

        return PreprocessingResponseDTO.builder()
                .datasetId(datasetId)
                .originalFilename(dataset.getFilename())
                .message("Preprocessing completed successfully. Processed file ready for download.")
                .processedFileResource(resource)
                .build();
    }
}