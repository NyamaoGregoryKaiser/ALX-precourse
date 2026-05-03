package com.mlutil.ml_utilities_system.util;

import com.mlutil.ml_utilities_system.exception.InvalidDataException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

/**
 * A utility class for common Machine Learning data processing tasks.
 * This class provides methods for loading/saving CSV, feature scaling,
 * one-hot encoding, missing value imputation, and model evaluation metrics.
 *
 * It avoids external ML libraries to demonstrate core algorithm design.
 */
@Component
@Slf4j
public class DataProcessor {

    public enum ImputationStrategy {
        MEAN,
        MEDIAN
    }

    // --- CSV File Handling ---

    /**
     * Loads a CSV file into a List of Maps, where each Map represents a row.
     * The keys of the Map are the column headers.
     *
     * @param filePath The path to the CSV file.
     * @return A list of maps, each representing a row of data.
     * @throws IOException If an I/O error occurs.
     * @throws InvalidDataException If CSV parsing fails or file is malformed.
     */
    public List<Map<String, String>> loadCsv(Path filePath) throws IOException {
        List<Map<String, String>> data = new ArrayList<>();
        try (Reader reader = Files.newBufferedReader(filePath);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader().withTrim())) {

            for (CSVRecord csvRecord : csvParser) {
                Map<String, String> row = new HashMap<>(csvRecord.toMap());
                data.add(row);
            }
        } catch (IOException e) {
            log.error("Failed to load CSV from {}: {}", filePath, e.getMessage());
            throw new IOException("Failed to load CSV file: " + e.getMessage(), e);
        } catch (Exception e) { // Catch other potential parsing errors
            log.error("Error parsing CSV from {}: {}", filePath, e.getMessage());
            throw new InvalidDataException("Error parsing CSV file: " + e.getMessage(), e);
        }
        log.info("Loaded {} rows from CSV: {}", data.size(), filePath.getFileName());
        return data;
    }

    /**
     * Writes a List of Maps (data) to a CSV file.
     * Assumes all maps in the list have the same keys, which will become headers.
     *
     * @param data The list of maps to write.
     * @param filePath The path to the output CSV file.
     * @throws IOException If an I/O error occurs.
     */
    public void writeCsv(List<Map<String, String>> data, Path filePath) throws IOException {
        if (data == null || data.isEmpty()) {
            log.warn("Attempted to write empty data to CSV: {}", filePath.getFileName());
            Files.writeString(filePath, ""); // Create an empty file
            return;
        }

        List<String> headers = new ArrayList<>(data.get(0).keySet());
        try (Writer writer = Files.newBufferedWriter(filePath);
             CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader(headers.toArray(new String[0])))) {

            for (Map<String, String> row : data) {
                List<String> record = headers.stream()
                        .map(row::get)
                        .collect(Collectors.toList());
                csvPrinter.printRecord(record);
            }
        } catch (IOException e) {
            log.error("Failed to write CSV to {}: {}", filePath, e.getMessage());
            throw new IOException("Failed to write CSV file: " + e.getMessage(), e);
        }
        log.info("Wrote {} rows to CSV: {}", data.size(), filePath.getFileName());
    }

    // --- Data Preprocessing ---

    /**
     * Applies Min-Max Scaling to specified numerical columns.
     * Scales values to a range [0, 1].
     * new_value = (value - min) / (max - min)
     *
     * @param data The dataset (List of Maps).
     * @param columns The list of columns to scale.
     * @return The preprocessed dataset.
     * @throws InvalidDataException If a column is not numeric or min equals max.
     */
    public List<Map<String, String>> minMaxScale(List<Map<String, String>> data, List<String> columns) {
        if (data.isEmpty() || columns.isEmpty()) return data;

        List<Map<String, String>> processedData = new ArrayList<>(data.size());
        for (Map<String, String> row : data) {
            processedData.add(new HashMap<>(row)); // Deep copy each row
        }

        for (String col : columns) {
            List<Double> colValues = processedData.stream()
                    .map(row -> row.get(col))
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && !s.equalsIgnoreCase("NaN") && !s.equalsIgnoreCase("NULL")) // Filter out missing values
                    .map(s -> {
                        try { return Double.parseDouble(s); }
                        catch (NumberFormatException e) { throw new InvalidDataException("Column '" + col + "' contains non-numeric values for Min-Max scaling."); }
                    })
                    .collect(Collectors.toList());

            if (colValues.isEmpty()) {
                log.warn("Column '{}' has no valid numeric values for Min-Max scaling. Skipping.", col);
                continue;
            }

            double min = colValues.stream().min(Double::compare).orElseThrow();
            double max = colValues.stream().max(Double::compare).orElseThrow();

            if (min == max) {
                log.warn("Column '{}' has all identical values, cannot perform Min-Max scaling. Values will be set to 0.0 if not missing.", col);
                for (Map<String, String> row : processedData) {
                    if (row.containsKey(col) && row.get(col) != null && !row.get(col).trim().isEmpty()
                            && !row.get(col).equalsIgnoreCase("NaN") && !row.get(col).equalsIgnoreCase("NULL")) {
                        row.put(col, "0.0");
                    }
                }
                continue;
            }

            for (Map<String, String> row : processedData) {
                String valStr = row.get(col);
                if (valStr != null && !valStr.trim().isEmpty() && !valStr.equalsIgnoreCase("NaN") && !valStr.equalsIgnoreCase("NULL")) {
                    try {
                        double value = Double.parseDouble(valStr);
                        double scaledValue = (value - min) / (max - min);
                        row.put(col, String.valueOf(scaledValue));
                    } catch (NumberFormatException e) {
                        // Already handled, but just in case, leave as is or set to a placeholder
                        log.warn("Non-numeric value found in column '{}' during Min-Max scaling, skipping row value.", col);
                    }
                }
            }
        }
        log.info("Applied Min-Max scaling to columns: {}", columns);
        return processedData;
    }

    /**
     * Applies Standard Scaling (Z-score normalization) to specified numerical columns.
     * new_value = (value - mean) / standard_deviation
     *
     * @param data The dataset (List of Maps).
     * @param columns The list of columns to scale.
     * @return The preprocessed dataset.
     * @throws InvalidDataException If a column is not numeric or standard deviation is zero.
     */
    public List<Map<String, String>> standardScale(List<Map<String, String>> data, List<String> columns) {
        if (data.isEmpty() || columns.isEmpty()) return data;

        List<Map<String, String>> processedData = new ArrayList<>(data.size());
        for (Map<String, String> row : data) {
            processedData.add(new HashMap<>(row)); // Deep copy each row
        }

        for (String col : columns) {
            List<Double> colValues = processedData.stream()
                    .map(row -> row.get(col))
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && !s.equalsIgnoreCase("NaN") && !s.equalsIgnoreCase("NULL"))
                    .map(s -> {
                        try { return Double.parseDouble(s); }
                        catch (NumberFormatException e) { throw new InvalidDataException("Column '" + col + "' contains non-numeric values for Standard scaling."); }
                    })
                    .collect(Collectors.toList());

            if (colValues.isEmpty()) {
                log.warn("Column '{}' has no valid numeric values for Standard scaling. Skipping.", col);
                continue;
            }

            double sum = colValues.stream().mapToDouble(Double::doubleValue).sum();
            double mean = sum / colValues.size();

            double sumOfSquares = colValues.stream().mapToDouble(val -> Math.pow(val - mean, 2)).sum();
            double stdDev = Math.sqrt(sumOfSquares / colValues.size());

            if (stdDev == 0) {
                log.warn("Column '{}' has zero standard deviation (all identical values), cannot perform Standard scaling. Values will be set to 0.0 if not missing.", col);
                for (Map<String, String> row : processedData) {
                    if (row.containsKey(col) && row.get(col) != null && !row.get(col).trim().isEmpty()
                            && !row.get(col).equalsIgnoreCase("NaN") && !row.get(col).equalsIgnoreCase("NULL")) {
                        row.put(col, "0.0");
                    }
                }
                continue;
            }

            for (Map<String, String> row : processedData) {
                String valStr = row.get(col);
                if (valStr != null && !valStr.trim().isEmpty() && !valStr.equalsIgnoreCase("NaN") && !valStr.equalsIgnoreCase("NULL")) {
                    try {
                        double value = Double.parseDouble(valStr);
                        double scaledValue = (value - mean) / stdDev;
                        row.put(col, String.valueOf(scaledValue));
                    } catch (NumberFormatException e) {
                        log.warn("Non-numeric value found in column '{}' during Standard scaling, skipping row value.", col);
                    }
                }
            }
        }
        log.info("Applied Standard scaling to columns: {}", columns);
        return processedData;
    }

    /**
     * Applies One-Hot Encoding to specified categorical columns.
     * Creates new binary columns for each unique category.
     *
     * @param data The dataset (List of Maps).
     * @param columns The list of columns to encode.
     * @return The preprocessed dataset with new one-hot encoded columns.
     */
    public List<Map<String, String>> oneHotEncode(List<Map<String, String>> data, List<String> columns) {
        if (data.isEmpty() || columns.isEmpty()) return data;

        List<Map<String, String>> processedData = new ArrayList<>();
        List<String> allHeaders = new ArrayList<>(data.get(0).keySet());

        for (String col : columns) {
            Set<String> uniqueCategories = data.stream()
                    .map(row -> row.get(col))
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && !s.equalsIgnoreCase("NaN") && !s.equalsIgnoreCase("NULL"))
                    .collect(Collectors.toSet());

            if (uniqueCategories.isEmpty()) {
                log.warn("Column '{}' has no valid categories for One-Hot Encoding. Skipping.", col);
                continue;
            }
            if (uniqueCategories.size() > 50) { // Arbitrary limit to prevent excessive column creation
                log.warn("Column '{}' has too many unique categories ({} > 50) for One-Hot Encoding. Skipping.", col, uniqueCategories.size());
                continue;
            }

            // Add new headers for each category
            for (String category : uniqueCategories) {
                allHeaders.add(col + "_" + category.replaceAll("[^a-zA-Z0-9_]", "_")); // Sanitize category name for column
            }
        }

        // Remove original encoded columns from headers, if they were there initially
        allHeaders.removeAll(columns);

        for (Map<String, String> originalRow : data) {
            Map<String, String> newRow = new HashMap<>();

            // Copy existing columns, excluding those being one-hot encoded
            for (String header : originalRow.keySet()) {
                if (!columns.contains(header)) {
                    newRow.put(header, originalRow.get(header));
                }
            }

            // Add one-hot encoded columns
            for (String col : columns) {
                String categoryValue = originalRow.get(col);
                // Get all unique categories for this column again for consistent columns across rows
                Set<String> uniqueCategories = data.stream()
                        .map(row -> row.get(col))
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty() && !s.equalsIgnoreCase("NaN") && !s.equalsIgnoreCase("NULL"))
                        .collect(Collectors.toSet());

                for (String uniqueCat : uniqueCategories) {
                    String newColName = col + "_" + uniqueCat.replaceAll("[^a-zA-Z0-9_]", "_");
                    if (categoryValue != null && categoryValue.trim().equals(uniqueCat)) {
                        newRow.put(newColName, "1");
                    } else {
                        newRow.put(newColName, "0");
                    }
                }
            }
            processedData.add(newRow);
        }
        log.info("Applied One-Hot Encoding to columns: {}", columns);
        return processedData;
    }

    /**
     * Imputes missing values in specified numerical columns using a given strategy (Mean or Median).
     * Missing values are assumed to be null, empty strings, "NaN", or "NULL".
     *
     * @param data The dataset (List of Maps).
     * @param columns The list of numerical columns to impute.
     * @param strategy The imputation strategy (MEAN or MEDIAN).
     * @return The preprocessed dataset with imputed values.
     * @throws InvalidDataException If a column is not numeric.
     */
    public List<Map<String, String>> imputeMissing(List<Map<String, String>> data, List<String> columns, ImputationStrategy strategy) {
        if (data.isEmpty() || columns.isEmpty()) return data;

        List<Map<String, String>> processedData = new ArrayList<>(data.size());
        for (Map<String, String> row : data) {
            processedData.add(new HashMap<>(row)); // Deep copy each row
        }

        for (String col : columns) {
            List<Double> validValues = processedData.stream()
                    .map(row -> row.get(col))
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && !s.equalsIgnoreCase("NaN") && !s.equalsIgnoreCase("NULL"))
                    .map(s -> {
                        try { return Double.parseDouble(s); }
                        catch (NumberFormatException e) { throw new InvalidDataException("Column '" + col + "' contains non-numeric values for imputation."); }
                    })
                    .collect(Collectors.toList());

            if (validValues.isEmpty()) {
                log.warn("Column '{}' has no valid numeric values for imputation. Skipping.", col);
                continue;
            }

            double imputationValue;
            if (strategy == ImputationStrategy.MEAN) {
                imputationValue = validValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                log.debug("Calculated mean for column '{}': {}", col, imputationValue);
            } else { // MEDIAN
                Collections.sort(validValues);
                int middle = validValues.size() / 2;
                imputationValue = (validValues.size() % 2 == 1) ?
                        validValues.get(middle) :
                        (validValues.get(middle - 1) + validValues.get(middle)) / 2.0;
                log.debug("Calculated median for column '{}': {}", col, imputationValue);
            }

            for (Map<String, String> row : processedData) {
                String val = row.get(col);
                if (val == null || val.trim().isEmpty() || val.equalsIgnoreCase("NaN") || val.equalsIgnoreCase("NULL")) {
                    row.put(col, String.valueOf(imputationValue));
                }
            }
        }
        log.info("Applied {} imputation to columns: {}", strategy, columns);
        return processedData;
    }


    // --- Model Evaluation Metrics ---

    /**
     * Calculates common classification metrics: Accuracy, Precision, Recall, F1-Score.
     * Assumes binary classification for precision/recall/F1, or multi-class for accuracy.
     * Precision, Recall, F1 are calculated for each unique class in true labels (macro average).
     *
     * @param trueLabels List of true labels.
     * @param predictions List of predicted labels.
     * @return A map of metric names to their values.
     * @throws InvalidDataException If lists are null, empty, or have different sizes.
     */
    public Map<String, Double> calculateClassificationMetrics(List<String> trueLabels, List<String> predictions) {
        if (trueLabels == null || predictions == null || trueLabels.isEmpty() || predictions.isEmpty() || trueLabels.size() != predictions.size()) {
            throw new InvalidDataException("True labels and predictions lists must be non-null, non-empty, and of equal size.");
        }

        Map<String, Double> metrics = new HashMap<>();

        // Accuracy
        long correctPredictions = 0;
        for (int i = 0; i < trueLabels.size(); i++) {
            if (trueLabels.get(i).equals(predictions.get(i))) {
                correctPredictions++;
            }
        }
        double accuracy = (double) correctPredictions / trueLabels.size();
        metrics.put("Accuracy", accuracy);

        // Precision, Recall, F1-Score (Macro Average)
        Set<String> uniqueLabels = new HashSet<>(trueLabels);
        uniqueLabels.addAll(predictions);

        double totalPrecision = 0.0;
        double totalRecall = 0.0;
        double totalF1 = 0.0;
        int numClasses = 0;

        for (String label : uniqueLabels) {
            int tp = 0; // True Positives
            int fp = 0; // False Positives
            int fn = 0; // False Negatives

            for (int i = 0; i < trueLabels.size(); i++) {
                String trueLabel = trueLabels.get(i);
                String predLabel = predictions.get(i);

                if (trueLabel.equals(label) && predLabel.equals(label)) {
                    tp++;
                } else if (!trueLabel.equals(label) && predLabel.equals(label)) {
                    fp++;
                } else if (trueLabel.equals(label) && !predLabel.equals(label)) {
                    fn++;
                }
            }

            // Avoid division by zero
            double precision = (tp + fp == 0) ? 0.0 : (double) tp / (tp + fp);
            double recall = (tp + fn == 0) ? 0.0 : (double) tp / (tp + fn);
            double f1 = (precision + recall == 0) ? 0.0 : 2 * (precision * recall) / (precision + recall);

            if (tp > 0 || fp > 0 || fn > 0) { // Only count classes that actually appeared
                totalPrecision += precision;
                totalRecall += recall;
                totalF1 += f1;
                numClasses++;
            }
        }

        if (numClasses > 0) {
            metrics.put("Precision (Macro)", totalPrecision / numClasses);
            metrics.put("Recall (Macro)", totalRecall / numClasses);
            metrics.put("F1-Score (Macro)", totalF1 / numClasses);
        } else {
            metrics.put("Precision (Macro)", 0.0);
            metrics.put("Recall (Macro)", 0.0);
            metrics.put("F1-Score (Macro)", 0.0);
        }
        log.info("Calculated classification metrics: {}", metrics);
        return metrics;
    }


    /**
     * Calculates common regression metrics: Mean Squared Error (MSE), Root Mean Squared Error (RMSE),
     * Mean Absolute Error (MAE), R-squared.
     *
     * @param trueLabels List of true numerical labels.
     * @param predictions List of predicted numerical labels.
     * @return A map of metric names to their values.
     * @throws InvalidDataException If lists are null, empty, or have different sizes.
     */
    public Map<String, Double> calculateRegressionMetrics(List<Double> trueLabels, List<Double> predictions) {
        if (trueLabels == null || predictions == null || trueLabels.isEmpty() || predictions.isEmpty() || trueLabels.size() != predictions.size()) {
            throw new InvalidDataException("True labels and predictions lists must be non-null, non-empty, and of equal size for regression.");
        }

        Map<String, Double> metrics = new HashMap<>();
        int n = trueLabels.size();

        double sumSquaredError = 0.0;
        double sumAbsoluteError = 0.0;
        double sumTrueLabels = 0.0; // For R-squared

        for (int i = 0; i < n; i++) {
            double trueVal = trueLabels.get(i);
            double predVal = predictions.get(i);

            double error = trueVal - predVal;
            sumSquaredError += Math.pow(error, 2);
            sumAbsoluteError += Math.abs(error);
            sumTrueLabels += trueVal;
        }

        // MSE
        double mse = sumSquaredError / n;
        metrics.put("MSE", mse);

        // RMSE
        double rmse = Math.sqrt(mse);
        metrics.put("RMSE", rmse);

        // MAE
        double mae = sumAbsoluteError / n;
        metrics.put("MAE", mae);

        // R-squared (Coefficient of Determination)
        double meanTrueLabel = sumTrueLabels / n;
        double totalSumOfSquares = trueLabels.stream().mapToDouble(val -> Math.pow(val - meanTrueLabel, 2)).sum();
        double rSquared = (totalSumOfSquares == 0) ? 1.0 : 1 - (sumSquaredError / totalSumOfSquares); // If totalSumOfSquares is 0, all true labels are identical, a perfect fit means R^2 = 1
        metrics.put("R-squared", rSquared);

        log.info("Calculated regression metrics: {}", metrics);
        return metrics;
    }
}