package com.mlutil.ml_utilities_system.util;

import com.mlutil.ml_utilities_system.exception.InvalidDataException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DataProcessorTest {

    private DataProcessor dataProcessor;

    @TempDir
    Path tempDir; // JUnit 5 provides a temporary directory

    @BeforeEach
    void setUp() {
        dataProcessor = new DataProcessor();
    }

    // --- CSV File Handling Tests ---

    @Test
    @DisplayName("Should load CSV file correctly with headers")
    void shouldLoadCsvFileCorrectly() throws IOException {
        Path csvFile = tempDir.resolve("test.csv");
        String content = "Header1,Header2,Header3\nvalue1,value2,value3\nanother1,another2,another3";
        java.nio.file.Files.writeString(csvFile, content);

        List<Map<String, String>> data = dataProcessor.loadCsv(csvFile);

        assertThat(data).hasSize(2);
        assertThat(data.get(0)).containsEntry("Header1", "value1");
        assertThat(data.get(1)).containsEntry("Header2", "another2");
    }

    @Test
    @DisplayName("Should handle empty CSV file gracefully during loading")
    void shouldHandleEmptyCsvFile() throws IOException {
        Path csvFile = tempDir.resolve("empty.csv");
        String content = "Header1,Header2"; // Only header, no data rows
        java.nio.file.Files.writeString(csvFile, content);

        List<Map<String, String>> data = dataProcessor.loadCsv(csvFile);

        assertThat(data).isEmpty();
    }

    @Test
    @DisplayName("Should write data to CSV file correctly")
    void shouldWriteCsvFileCorrectly() throws IOException {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("A", "1", "B", "2")),
                new HashMap<>(Map.of("A", "3", "B", "4"))
        );
        Path outputFile = tempDir.resolve("output.csv");

        dataProcessor.writeCsv(data, outputFile);

        String expectedContent = "A,B\r\n1,2\r\n3,4\r\n"; // CSVPrinter adds \r\n
        String actualContent = java.nio.file.Files.readString(outputFile);

        assertThat(actualContent).isEqualTo(expectedContent);
    }

    @Test
    @DisplayName("Should write empty data to CSV file as empty file")
    void shouldWriteEmptyCsvFile() throws IOException {
        List<Map<String, String>> data = List.of();
        Path outputFile = tempDir.resolve("empty_output.csv");

        dataProcessor.writeCsv(data, outputFile);

        String actualContent = java.nio.file.Files.readString(outputFile);
        assertThat(actualContent).isEmpty(); // Or empty with just headers depending on CSVFormat
    }

    // --- Min-Max Scaling Tests ---

    @Test
    @DisplayName("Should apply Min-Max scaling to a single column")
    void shouldApplyMinMaxScalingSingleColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "10", "other", "A")),
                new HashMap<>(Map.of("feature", "20", "other", "B")),
                new HashMap<>(Map.of("feature", "30", "other", "C"))
        );
        List<String> columns = List.of("feature");

        List<Map<String, String>> scaledData = dataProcessor.minMaxScale(data, columns);

        assertThat(scaledData).hasSize(3);
        assertThat(Double.parseDouble(scaledData.get(0).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(1).get("feature"))).isEqualTo(0.5);
        assertThat(Double.parseDouble(scaledData.get(2).get("feature"))).isEqualTo(1.0);
        assertThat(scaledData.get(0).get("other")).isEqualTo("A"); // Other columns unchanged
    }

    @Test
    @DisplayName("Should handle columns with identical values for Min-Max scaling")
    void shouldHandleIdenticalValuesMinMaxScaling() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "10")),
                new HashMap<>(Map.of("feature", "10")),
                new HashMap<>(Map.of("feature", "10"))
        );
        List<String> columns = List.of("feature");

        List<Map<String, String>> scaledData = dataProcessor.minMaxScale(data, columns);

        assertThat(scaledData).hasSize(3);
        assertThat(Double.parseDouble(scaledData.get(0).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(1).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(2).get("feature"))).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should throw InvalidDataException for non-numeric Min-Max column")
    void shouldThrowExceptionForNonNumericMinMaxColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "abc")),
                new HashMap<>(Map.of("feature", "10"))
        );
        List<String> columns = List.of("feature");

        assertThrows(InvalidDataException.class, () -> dataProcessor.minMaxScale(data, columns));
    }

    @Test
    @DisplayName("Should handle missing values gracefully in Min-Max scaling")
    void shouldHandleMissingValuesMinMaxScaling() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "10")),
                new HashMap<>(Map.of("feature", "20")),
                new HashMap<>(Map.of("feature", "NaN")), // Missing
                new HashMap<>(Map.of("feature", "NULL")), // Missing
                new HashMap<>(Map.of("feature", "")), // Empty
                new HashMap<>(Map.of("feature", "30"))
        );
        List<String> columns = List.of("feature");

        List<Map<String, String>> scaledData = dataProcessor.minMaxScale(data, columns);

        assertThat(scaledData).hasSize(6);
        assertThat(Double.parseDouble(scaledData.get(0).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(1).get("feature"))).isEqualTo(0.5);
        assertThat(scaledData.get(2).get("feature")).isEqualTo("NaN"); // Missing values remain missing
        assertThat(scaledData.get(3).get("feature")).isEqualTo("NULL");
        assertThat(scaledData.get(4).get("feature")).isEqualTo("");
        assertThat(Double.parseDouble(scaledData.get(5).get("feature"))).isEqualTo(1.0);
    }

    // --- Standard Scaling Tests ---

    @Test
    @DisplayName("Should apply Standard scaling to a single column")
    void shouldApplyStandardScalingSingleColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "1", "other", "A")),
                new HashMap<>(Map.of("feature", "2", "other", "B")),
                new HashMap<>(Map.of("feature", "3", "other", "C"))
        ); // Mean=2, StdDev approx 0.816
        List<String> columns = List.of("feature");

        List<Map<String, String>> scaledData = dataProcessor.standardScale(data, columns);

        assertThat(scaledData).hasSize(3);
        assertThat(Double.parseDouble(scaledData.get(0).get("feature"))).isCloseTo(-1.22, 0.01);
        assertThat(Double.parseDouble(scaledData.get(1).get("feature"))).isCloseTo(0.0, 0.01);
        assertThat(Double.parseDouble(scaledData.get(2).get("feature"))).isCloseTo(1.22, 0.01);
        assertThat(scaledData.get(0).get("other")).isEqualTo("A");
    }

    @Test
    @DisplayName("Should handle columns with identical values for Standard scaling")
    void shouldHandleIdenticalValuesStandardScaling() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "10")),
                new HashMap<>(Map.of("feature", "10")),
                new HashMap<>(Map.of("feature", "10"))
        );
        List<String> columns = List.of("feature");

        List<Map<String, String>> scaledData = dataProcessor.standardScale(data, columns);

        assertThat(scaledData).hasSize(3);
        assertThat(Double.parseDouble(scaledData.get(0).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(1).get("feature"))).isEqualTo(0.0);
        assertThat(Double.parseDouble(scaledData.get(2).get("feature"))).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should throw InvalidDataException for non-numeric Standard scaling column")
    void shouldThrowExceptionForNonNumericStandardScalingColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("feature", "abc")),
                new HashMap<>(Map.of("feature", "10"))
        );
        List<String> columns = List.of("feature");

        assertThrows(InvalidDataException.class, () -> dataProcessor.standardScale(data, columns));
    }

    // --- One-Hot Encoding Tests ---

    @Test
    @DisplayName("Should apply One-Hot Encoding to a single categorical column")
    void shouldApplyOneHotEncodingSingleColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("color", "red", "value", "10")),
                new HashMap<>(Map.of("color", "blue", "value", "20")),
                new HashMap<>(Map.of("color", "red", "value", "30")),
                new HashMap<>(Map.of("color", "green", "value", "40"))
        );
        List<String> columns = List.of("color");

        List<Map<String, String>> encodedData = dataProcessor.oneHotEncode(data, columns);

        assertThat(encodedData).hasSize(4);
        // Original 'color' column should be removed
        assertThat(encodedData.get(0)).doesNotContainKey("color");
        // New columns should exist
        assertThat(encodedData.get(0)).containsKey("color_red");
        assertThat(encodedData.get(0)).containsKey("color_blue");
        assertThat(encodedData.get(0)).containsKey("color_green");

        assertThat(encodedData.get(0)).containsEntry("color_red", "1").containsEntry("color_blue", "0").containsEntry("color_green", "0");
        assertThat(encodedData.get(1)).containsEntry("color_red", "0").containsEntry("color_blue", "1").containsEntry("color_green", "0");
        assertThat(encodedData.get(2)).containsEntry("color_red", "1").containsEntry("color_blue", "0").containsEntry("color_green", "0");
        assertThat(encodedData.get(3)).containsEntry("color_red", "0").containsEntry("color_blue", "0").containsEntry("color_green", "1");
        assertThat(encodedData.get(0).get("value")).isEqualTo("10"); // Other column unchanged
    }

    @Test
    @DisplayName("Should handle missing values in One-Hot Encoding")
    void shouldHandleMissingValuesOneHotEncoding() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("color", "red")),
                new HashMap<>(Map.of("color", "blue")),
                new HashMap<>(Map.of("color", "NaN")), // Missing
                new HashMap<>(Map.of("color", "")) // Empty
        );
        List<String> columns = List.of("color");

        List<Map<String, String>> encodedData = dataProcessor.oneHotEncode(data, columns);

        assertThat(encodedData).hasSize(4);
        assertThat(encodedData.get(0)).containsEntry("color_red", "1").containsEntry("color_blue", "0");
        assertThat(encodedData.get(1)).containsEntry("color_red", "0").containsEntry("color_blue", "1");
        assertThat(encodedData.get(2)).containsEntry("color_red", "0").containsEntry("color_blue", "0"); // Missing remain 0
        assertThat(encodedData.get(3)).containsEntry("color_red", "0").containsEntry("color_blue", "0");
    }


    // --- Imputation Tests ---

    @Test
    @DisplayName("Should impute missing values with mean strategy")
    void shouldImputeMissingWithMean() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("age", "20")),
                new HashMap<>(Map.of("age", "30")),
                new HashMap<>(Map.of("age", "NaN")), // Missing
                new HashMap<>(Map.of("age", "")), // Empty
                new HashMap<>(Map.of("age", "40"))
        ); // Mean of (20, 30, 40) is 30
        List<String> columns = List.of("age");

        List<Map<String, String>> imputedData = dataProcessor.imputeMissing(data, columns, DataProcessor.ImputationStrategy.MEAN);

        assertThat(imputedData).hasSize(5);
        assertThat(imputedData.get(0).get("age")).isEqualTo("20");
        assertThat(imputedData.get(1).get("age")).isEqualTo("30");
        assertThat(imputedData.get(2).get("age")).isEqualTo("30.0"); // Imputed
        assertThat(imputedData.get(3).get("age")).isEqualTo("30.0"); // Imputed
        assertThat(imputedData.get(4).get("age")).isEqualTo("40");
    }

    @Test
    @DisplayName("Should impute missing values with median strategy for odd number of values")
    void shouldImputeMissingWithMedianOdd() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("age", "20")),
                new HashMap<>(Map.of("age", "50")),
                new HashMap<>(Map.of("age", "NaN")),
                new HashMap<>(Map.of("age", "30")),
                new HashMap<>(Map.of("age", "40"))
        ); // Sorted (20, 30, 40, 50), Median of (20, 30, 40, 50) is 35.0
        List<String> columns = List.of("age");

        List<Map<String, String>> imputedData = dataProcessor.imputeMissing(data, columns, DataProcessor.ImputationStrategy.MEDIAN);

        assertThat(imputedData).hasSize(5);
        assertThat(Double.parseDouble(imputedData.get(2).get("age"))).isEqualTo(35.0);
    }

    @Test
    @DisplayName("Should impute missing values with median strategy for even number of values")
    void shouldImputeMissingWithMedianEven() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("age", "20")),
                new HashMap<>(Map.of("age", "50")),
                new HashMap<>(Map.of("age", "NaN")),
                new HashMap<>(Map.of("age", "30"))
        ); // Sorted (20, 30, 50), Median of (20, 30, 50) is 30.0 (middle element for odd size)
        List<String> columns = List.of("age");

        List<Map<String, String>> imputedData = dataProcessor.imputeMissing(data, columns, DataProcessor.ImputationStrategy.MEDIAN);

        assertThat(imputedData).hasSize(4);
        assertThat(Double.parseDouble(imputedData.get(2).get("age"))).isEqualTo(30.0);
    }


    @Test
    @DisplayName("Should throw InvalidDataException for non-numeric imputation column")
    void shouldThrowExceptionForNonNumericImputationColumn() {
        List<Map<String, String>> data = Arrays.asList(
                new HashMap<>(Map.of("age", "abc")),
                new HashMap<>(Map.of("age", "10"))
        );
        List<String> columns = List.of("age");

        assertThrows(InvalidDataException.class, () -> dataProcessor.imputeMissing(data, columns, DataProcessor.ImputationStrategy.MEAN));
    }

    // --- Classification Metrics Tests ---

    @Test
    @DisplayName("Should calculate classification metrics for binary classification")
    void shouldCalculateBinaryClassificationMetrics() {
        List<String> trueLabels = Arrays.asList("cat", "cat", "dog", "dog", "cat");
        List<String> predictions = Arrays.asList("cat", "dog", "dog", "cat", "cat");

        Map<String, Double> metrics = dataProcessor.calculateClassificationMetrics(trueLabels, predictions);

        assertThat(metrics).containsKeys("Accuracy", "Precision (Macro)", "Recall (Macro)", "F1-Score (Macro)");
        assertThat(metrics.get("Accuracy")).isEqualTo(0.6); // 3/5 correct
        assertThat(metrics.get("Precision (Macro)")).isCloseTo(0.666, 0.01); // (1/2 + 2/3)/2 approx (0.5+0.666)/2
        assertThat(metrics.get("Recall (Macro)")).isCloseTo(0.666, 0.01);   // (2/3 + 1/2)/2 approx (0.666+0.5)/2
        assertThat(metrics.get("F1-Score (Macro)")).isCloseTo(0.666, 0.01); // Macro average of F1 for each class
    }

    @Test
    @DisplayName("Should calculate classification metrics for multi-class classification")
    void shouldCalculateMultiClassClassificationMetrics() {
        List<String> trueLabels = Arrays.asList("A", "B", "C", "A", "B", "C");
        List<String> predictions = Arrays.asList("A", "A", "C", "B", "B", "C"); // 4/6 correct (A, C, B, C)

        Map<String, Double> metrics = dataProcessor.calculateClassificationMetrics(trueLabels, predictions);

        assertThat(metrics.get("Accuracy")).isCloseTo(4.0/6.0, 0.01);
    }

    @Test
    @DisplayName("Should throw InvalidDataException for mismatched classification lists")
    void shouldThrowExceptionForMismatchedClassificationLists() {
        List<String> trueLabels = Arrays.asList("A", "B");
        List<String> predictions = Arrays.asList("A");

        assertThrows(InvalidDataException.class, () -> dataProcessor.calculateClassificationMetrics(trueLabels, predictions));
    }

    // --- Regression Metrics Tests ---

    @Test
    @DisplayName("Should calculate regression metrics correctly")
    void shouldCalculateRegressionMetrics() {
        List<Double> trueLabels = Arrays.asList(10.0, 20.0, 30.0, 40.0);
        List<Double> predictions = Arrays.asList(11.0, 19.0, 32.0, 38.0);

        Map<String, Double> metrics = dataProcessor.calculateRegressionMetrics(trueLabels, predictions);

        assertThat(metrics).containsKeys("MSE", "RMSE", "MAE", "R-squared");
        assertThat(metrics.get("MSE")).isCloseTo(2.5, 0.01); // (1^2 + (-1)^2 + 2^2 + (-2)^2) / 4 = (1+1+4+4)/4 = 10/4 = 2.5
        assertThat(metrics.get("RMSE")).isCloseTo(Math.sqrt(2.5), 0.01); // ~1.581
        assertThat(metrics.get("MAE")).isCloseTo(1.5, 0.01); // (|1|+|-1|+|2|+|-2|) / 4 = (1+1+2+2)/4 = 6/4 = 1.5
        assertThat(metrics.get("R-squared")).isCloseTo(0.963, 0.01); // Calculated (approx)
    }

    @Test
    @DisplayName("Should handle perfect regression prediction with R-squared of 1.0")
    void shouldHandlePerfectRegressionPrediction() {
        List<Double> trueLabels = Arrays.asList(10.0, 20.0, 30.0);
        List<Double> predictions = Arrays.asList(10.0, 20.0, 30.0);

        Map<String, Double> metrics = dataProcessor.calculateRegressionMetrics(trueLabels, predictions);

        assertThat(metrics.get("MSE")).isCloseTo(0.0, 0.001);
        assertThat(metrics.get("RMSE")).isCloseTo(0.0, 0.001);
        assertThat(metrics.get("MAE")).isCloseTo(0.0, 0.001);
        assertThat(metrics.get("R-squared")).isCloseTo(1.0, 0.001);
    }

    @Test
    @DisplayName("Should throw InvalidDataException for mismatched regression lists")
    void shouldThrowExceptionForMismatchedRegressionLists() {
        List<Double> trueLabels = Arrays.asList(1.0, 2.0);
        List<Double> predictions = Arrays.asList(1.0);

        assertThrows(InvalidDataException.class, () -> dataProcessor.calculateRegressionMetrics(trueLabels, predictions));
    }
}