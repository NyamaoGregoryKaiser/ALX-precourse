```java
package com.alx.vizflow.service;

import com.alx.vizflow.exception.ResourceNotFoundException;
import com.alx.vizflow.model.Dataset;
import com.alx.vizflow.model.DataSource;
import com.alx.vizflow.model.User;
import com.alx.vizflow.repository.DatasetRepository;
import com.alx.vizflow.repository.DataSourceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@Transactional
@Slf4j
public class DatasetService {

    private final DatasetRepository datasetRepository;
    private final DataSourceRepository dataSourceRepository; // To link datasets to data sources
    private final ObjectMapper objectMapper; // For JSON parsing (schema, transformation)

    public DatasetService(DatasetRepository datasetRepository, DataSourceRepository dataSourceRepository, ObjectMapper objectMapper) {
        this.datasetRepository = datasetRepository;
        this.dataSourceRepository = dataSourceRepository;
        this.objectMapper = objectMapper;
    }

    // --- CRUD Operations ---
    public Dataset createDataset(Dataset dataset, Long dataSourceId, User currentUser) {
        DataSource dataSource = dataSourceRepository.findById(dataSourceId)
                .orElseThrow(() -> new ResourceNotFoundException("DataSource not found with id: " + dataSourceId));
        dataset.setDataSource(dataSource);
        dataset.setOwner(currentUser);
        // Basic validation for JSON fields
        validateJsonConfig(dataset.getSchemaDefinition(), "Schema definition is invalid JSON");
        validateJsonConfig(dataset.getTransformationLogic(), "Transformation logic is invalid JSON");

        return datasetRepository.save(dataset);
    }

    public Dataset getDatasetById(Long id) {
        return datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));
    }

    public List<Dataset> getAllDatasets() {
        return datasetRepository.findAll();
    }

    public List<Dataset> getDatasetsByOwner(User owner) {
        return datasetRepository.findByOwner(owner);
    }

    public Dataset updateDataset(Long id, Dataset updatedDataset, User currentUser) {
        Dataset existingDataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));

        // Ensure owner matches or current user has admin/editor rights
        if (!existingDataset.getOwner().getId().equals(currentUser.getId()) && !currentUser.getRoles().contains(new Role(null, Role.RoleName.ROLE_ADMIN))) {
            throw new SecurityException("User not authorized to update this dataset.");
        }

        existingDataset.setName(updatedDataset.getName());
        existingDataset.setQueryOrTable(updatedDataset.getQueryOrTable());
        existingDataset.setSchemaDefinition(updatedDataset.getSchemaDefinition());
        existingDataset.setTransformationLogic(updatedDataset.getTransformationLogic());

        validateJsonConfig(existingDataset.getSchemaDefinition(), "Schema definition is invalid JSON");
        validateJsonConfig(existingDataset.getTransformationLogic(), "Transformation logic is invalid JSON");

        return datasetRepository.save(existingDataset);
    }

    public void deleteDataset(Long id, User currentUser) {
        Dataset existingDataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));

        if (!existingDataset.getOwner().getId().equals(currentUser.getId()) && !currentUser.getRoles().contains(new Role(null, Role.RoleName.ROLE_ADMIN))) {
            throw new SecurityException("User not authorized to delete this dataset.");
        }
        datasetRepository.deleteById(id);
    }

    // --- Data Processing/Query Logic (ALX Focus) ---

    /**
     * Fetches raw data based on the dataset's data source and query.
     * This is a simplified placeholder. In a real system, this would involve:
     * 1. Parsing connectionDetails (e.g., JDBC URL, API endpoint, S3 bucket).
     * 2. Executing query (e.g., SQL query, API call, CSV read).
     * 3. Returning raw data, potentially as List<Map<String, Object>> or similar.
     * For now, it returns dummy data.
     */
    public List<Map<String, Object>> fetchRawData(Long datasetId) {
        Dataset dataset = getDatasetById(datasetId);
        DataSource dataSource = dataset.getDataSource();

        log.info("Fetching raw data for dataset: {} from data source: {}", dataset.getName(), dataSource.getName());

        // --- ALX: Programming Logic & Algorithm Design for Data Ingestion ---
        // This is where data source specific logic resides.
        // Example: if (dataSource.getType().equals("POSTGRES")) { ... JDBC logic ... }
        // if (dataSource.getType().equals("CSV_UPLOAD")) { ... Read from file storage ... }
        // if (dataSource.getType().equals("API")) { ... Make HTTP request ... }

        // Placeholder for actual data fetching logic
        // Imagine connecting to 'dataSource.getConnectionDetails()' and running 'dataset.getQueryOrTable()'
        return generateDummyData(); // Simulate data from a DB/API
    }

    /**
     * Applies transformation logic to raw data.
     * This is where aggregation, filtering, column renaming, type casting would occur.
     *
     * @param datasetId The ID of the dataset containing transformation logic.
     * @param rawData   The raw data fetched from the source.
     * @return Transformed data, ready for visualization.
     */
    public List<Map<String, Object>> applyTransformations(Long datasetId, List<Map<String, Object>> rawData) {
        Dataset dataset = getDatasetById(datasetId);
        String transformationLogicJson = dataset.getTransformationLogic();

        if (transformationLogicJson == null || transformationLogicJson.isEmpty() || transformationLogicJson.equals("{}")) {
            log.info("No transformation logic found for dataset {}. Returning raw data.", dataset.getName());
            return rawData;
        }

        try {
            JsonNode logicNode = objectMapper.readTree(transformationLogicJson);
            // --- ALX: Algorithm Design for Data Transformation ---
            // This is a complex area, often involving chaining operations.
            // Example structure of transformationLogicJson:
            // {
            //   "filters": [ {"column": "sales", "operator": ">", "value": 100} ],
            //   "aggregations": [ {"column": "amount", "type": "SUM", "alias": "total_amount", "groupBy": ["category"]} ],
            //   "renames": [ {"old": "product_name", "new": "Product"} ]
            // }

            // 1. Filtering (e.g., using Java Streams)
            List<Map<String, Object>> filteredData = rawData;
            if (logicNode.has("filters")) {
                for (JsonNode filter : logicNode.get("filters")) {
                    String column = filter.get("column").asText();
                    String operator = filter.get("operator").asText();
                    JsonNode valueNode = filter.get("value");

                    filteredData = filteredData.stream().filter(row -> {
                        Object rowValue = row.get(column);
                        if (rowValue == null) return false;
                        return evaluateFilter(rowValue, operator, valueNode);
                    }).collect(Collectors.toList());
                }
            }
            // 2. Aggregation (more complex, requires grouping and reducing)
            if (logicNode.has("aggregations")) {
                JsonNode aggregationsNode = logicNode.get("aggregations");
                for (JsonNode aggregation : aggregationsNode) {
                    String aggColumn = aggregation.get("column").asText();
                    String aggType = aggregation.get("type").asText(); // SUM, AVG, COUNT, MIN, MAX
                    String alias = aggregation.get("alias").asText();
                    List<String> groupByColumns = StreamSupport.stream(aggregation.get("groupBy").spliterator(), false)
                            .map(JsonNode::asText)
                            .collect(Collectors.toList());

                    // This is a simplified example for SUM, needs proper handling for different types and grouping keys
                    Map<List<Object>, Double> aggregatedResults = filteredData.stream()
                        .collect(Collectors.groupingBy(
                            row -> groupByColumns.stream().map(row::get).collect(Collectors.toList()),
                            Collectors.summingDouble(row -> ((Number) row.getOrDefault(aggColumn, 0)).doubleValue())
                        ));

                    // Convert aggregated results back to List<Map<String, Object>>
                    filteredData = aggregatedResults.entrySet().stream().map(entry -> {
                        Map<String, Object> newRow = new java.util.HashMap<>();
                        for (int i = 0; i < groupByColumns.size(); i++) {
                            newRow.put(groupByColumns.get(i), entry.getKey().get(i));
                        }
                        newRow.put(alias, entry.getValue());
                        return newRow;
                    }).collect(Collectors.toList());

                    // Note: This simple aggregation overwrites filteredData. A real system would need to merge or carefully structure.
                    break; // Only processing one aggregation for simplicity here
                }
            }

            // 3. Renaming (simple map operation)
            List<Map<String, Object>> transformedData = filteredData.stream().map(row -> {
                Map<String, Object> newRow = new java.util.HashMap<>();
                if (logicNode.has("renames")) {
                    for (JsonNode rename : logicNode.get("renames")) {
                        String oldName = rename.get("old").asText();
                        String newName = rename.get("new").asText();
                        if (row.containsKey(oldName)) {
                            newRow.put(newName, row.get(oldName));
                        } else { // Keep original if not renamed
                            newRow.put(oldName, row.get(oldName));
                        }
                    }
                } else {
                    newRow.putAll(row); // If no renames, keep all columns
                }
                return newRow;
            }).collect(Collectors.toList());

            return transformedData;

        } catch (IOException e) {
            log.error("Failed to parse transformation logic JSON: {}", transformationLogicJson, e);
            throw new IllegalArgumentException("Invalid transformation logic JSON format.", e);
        } catch (Exception e) {
            log.error("Error applying transformations for dataset {}: {}", datasetId, e.getMessage(), e);
            throw new RuntimeException("Error during data transformation.", e);
        }
    }


    /**
     * Utility method to evaluate filter conditions.
     * ALX: Example of basic logic and condition handling.
     */
    private boolean evaluateFilter(Object rowValue, String operator, JsonNode filterValueNode) {
        try {
            switch (operator.toLowerCase()) {
                case "=":
                case "==": return String.valueOf(rowValue).equals(filterValueNode.asText());
                case "!=": return !String.valueOf(rowValue).equals(filterValueNode.asText());
                case ">": return ((Number) rowValue).doubleValue() > filterValueNode.asDouble();
                case "<": return ((Number) rowValue).doubleValue() < filterValueNode.asDouble();
                case ">=": return ((Number) rowValue).doubleValue() >= filterValueNode.asDouble();
                case "<=": return ((Number) rowValue).doubleValue() <= filterValueNode.asDouble();
                case "contains": return String.valueOf(rowValue).contains(filterValueNode.asText());
                // Add more operators as needed (e.g., in, starts_with, ends_with)
                default:
                    log.warn("Unsupported filter operator: {}", operator);
                    return false;
            }
        } catch (ClassCastException e) {
            log.error("Type mismatch in filter for value '{}' with operator '{}' and filter value '{}'", rowValue, operator, filterValueNode);
            return false; // Handle type mismatches gracefully
        }
    }

    /**
     * Validates if a string is a valid JSON.
     */
    private void validateJsonConfig(String json, String errorMessage) {
        if (json == null || json.trim().isEmpty() || json.equals("null")) {
            return; // Allow empty/null JSON config
        }
        try {
            objectMapper.readTree(json);
        } catch (IOException e) {
            log.error("Invalid JSON configuration: {}", json, e);
            throw new IllegalArgumentException(errorMessage);
        }
    }

    /**
     * Generates dummy data for demonstration purposes.
     * This simulates data coming from a connected data source.
     */
    private List<Map<String, Object>> generateDummyData() {
        return List.of(
                Map.of("category", "Electronics", "sales", 1200.0, "units", 50, "region", "North"),
                Map.of("category", "Electronics", "sales", 800.0, "units", 30, "region", "South"),
                Map.of("category", "Clothing", "sales", 500.0, "units", 100, "region", "North"),
                Map.of("category", "Clothing", "sales", 1500.0, "units", 150, "region", "East"),
                Map.of("category", "Books", "sales", 300.0, "units", 20, "region", "West"),
                Map.of("category", "Electronics", "sales", 2000.0, "units", 75, "region", "East"),
                Map.of("category", "Books", "sales", 700.0, "units", 40, "region", "North")
        );
    }
}
```