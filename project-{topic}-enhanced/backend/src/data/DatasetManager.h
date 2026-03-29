```cpp
#ifndef DATAVIZ_DATASETMANAGER_H
#define DATAVIZ_DATASETMANAGER_H

#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <filesystem> // C++17 filesystem
#include <optional>
#include "../utils/Logger.h"
#include "models/Dataset.h" // For ColumnMetadata

// Represents the in-memory data table (vector of rows, where each row is a map of column_name -> value)
using DataTable = std::vector<std::map<std::string, std::string>>;

class DatasetManager {
private:
    std::string storage_path_;

    // Simple in-memory cache (dataset ID -> data table). For production, use a more sophisticated cache like Redis.
    std::map<int, DataTable> data_cache_;
    // Cache for column metadata inferred from files
    std::map<int, std::vector<ColumnMetadata>> metadata_cache_;

    // Helper to infer column types (very basic for demo)
    std::string inferColumnType(const std::string& value);
    std::vector<ColumnMetadata> inferColumns(const DataTable& data);

public:
    explicit DatasetManager(std::string storage_path);

    // Save uploaded file to disk
    std::string saveFile(const std::string& filename, const std::string& content);
    void deleteFile(const std::string& filepath);

    // Load a CSV file into an in-memory DataTable
    std::optional<DataTable> loadCsvFile(const std::string& filepath);

    // Get inferred column metadata for a dataset (from cache or by loading file)
    std::optional<std::vector<ColumnMetadata>> getOrInferColumns(int dataset_id, const std::string& filepath);

    // Get data table from cache or load it
    std::optional<DataTable> getOrLoadData(int dataset_id, const std::string& filepath);

    // Clear data from cache for a specific dataset
    void clearCache(int dataset_id);
};

#endif // DATAVIZ_DATASETMANAGER_H
```