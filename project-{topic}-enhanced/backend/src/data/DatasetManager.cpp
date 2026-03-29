```cpp
#include "DatasetManager.h"
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <cctype> // for std::isdigit, etc.

namespace fs = std::filesystem;

DatasetManager::DatasetManager(std::string storage_path) : storage_path_(std::move(storage_path)) {
    if (!fs::exists(storage_path_)) {
        try {
            fs::create_directories(storage_path_);
            Logger::info("Created data storage directory: {}", storage_path_);
        } catch (const fs::filesystem_error& e) {
            Logger::critical("Failed to create data storage directory {}: {}", storage_path_, e.what());
            throw;
        }
    } else {
        Logger::info("Data storage directory already exists: {}", storage_path_);
    }
}

std::string DatasetManager::saveFile(const std::string& filename, const std::string& content) {
    if (filename.empty() || content.empty()) {
        Logger::error("Attempted to save empty filename or content.");
        return "";
    }
    fs::path full_path = fs::path(storage_path_) / filename;
    std::ofstream ofs(full_path, std::ios::binary);
    if (!ofs.is_open()) {
        Logger::error("Failed to open file for writing: {}", full_path.string());
        return "";
    }
    ofs << content;
    ofs.close();
    Logger::info("File saved to: {}", full_path.string());
    return full_path.string();
}

void DatasetManager::deleteFile(const std::string& filepath) {
    if (filepath.empty()) {
        Logger::warn("Attempted to delete empty filepath.");
        return;
    }
    try {
        if (fs::exists(filepath)) {
            fs::remove(filepath);
            Logger::info("File deleted: {}", filepath);
        } else {
            Logger::warn("Attempted to delete non-existent file: {}", filepath);
        }
    } catch (const fs::filesystem_error& e) {
        Logger::error("Failed to delete file {}: {}", filepath, e.what());
    }
}

std::optional<DataTable> DatasetManager::loadCsvFile(const std::string& filepath) {
    Logger::debug("Loading CSV file: {}", filepath);
    std::ifstream file(filepath);
    if (!file.is_open()) {
        Logger::error("Failed to open CSV file: {}", filepath);
        return std::nullopt;
    }

    DataTable data_table;
    std::string line;
    std::vector<std::string> headers;
    bool first_line = true;

    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string cell;
        std::vector<std::string> row_cells;

        // Basic CSV parsing (comma delimited, no quotes handling for simplicity)
        // For production, use a dedicated CSV parsing library (e.g., rapidcsv, libcsv)
        while (std::getline(ss, cell, ',')) {
            // Trim whitespace
            cell.erase(0, cell.find_first_not_of(" \t\n\r\f\v"));
            cell.erase(cell.find_last_not_of(" \t\n\r\f\v") + 1);
            row_cells.push_back(cell);
        }

        if (first_line) {
            headers = row_cells;
            first_line = false;
            // Basic validation: ensure headers are not empty
            if (headers.empty() || std::all_of(headers.begin(), headers.end(), [](const std::string& h){ return h.empty(); })) {
                Logger::error("CSV file {} has empty or invalid headers.", filepath);
                return std::nullopt;
            }
        } else {
            if (row_cells.size() != headers.size()) {
                Logger::warn("Row has {} columns, expected {}. Skipping row: {}", row_cells.size(), headers.size(), line);
                continue;
            }
            std::map<std::string, std::string> row_map;
            for (size_t i = 0; i < headers.size(); ++i) {
                row_map[headers[i]] = row_cells[i];
            }
            data_table.push_back(row_map);
        }
    }
    Logger::info("CSV file {} loaded. {} rows, {} columns.", filepath, data_table.size(), headers.size());
    return data_table;
}

std::string DatasetManager::inferColumnType(const std::string& value) {
    if (value.empty()) {
        return "string"; // Cannot infer from empty
    }
    // Try to convert to double
    try {
        size_t pos;
        std::stod(value, &pos);
        if (pos == value.length()) { // Successfully converted entire string to number
            return "number";
        }
    } catch (...) {
        // Not a number
    }

    // Basic date check (YYYY-MM-DD or similar) - needs a more robust regex/parser for production
    if (value.length() >= 8 && value.length() <= 10 &&
        std::count(value.begin(), value.end(), '-') >= 2 &&
        std::all_of(value.begin(), value.end(), [](char c){ return std::isdigit(c) || c == '-'; })) {
        return "date";
    }

    return "string";
}

std::vector<ColumnMetadata> DatasetManager::inferColumns(const DataTable& data) {
    if (data.empty()) {
        return {};
    }

    // Take the first row to get column names
    const auto& first_row = data[0];
    std::vector<ColumnMetadata> columns;

    for (const auto& pair : first_row) {
        ColumnMetadata col;
        col.name = pair.first;
        col.type = "string"; // Default type

        // For type inference, inspect a few non-empty rows for this column
        std::string sample_value;
        for (const auto& row : data) {
            auto it = row.find(col.name);
            if (it != row.end() && !it->second.empty()) {
                sample_value = it->second;
                break;
            }
        }
        if (!sample_value.empty()) {
            col.type = inferColumnType(sample_value);
        }

        // Basic dimension/measure inference: numbers are measures, others are dimensions
        col.is_dimension = (col.type == "string" || col.type == "date");
        col.is_measure = (col.type == "number");

        columns.push_back(col);
    }
    Logger::debug("Inferred {} columns from data.", columns.size());
    return columns;
}

std::optional<std::vector<ColumnMetadata>> DatasetManager::getOrInferColumns(int dataset_id, const std::string& filepath) {
    // Check cache first
    auto it = metadata_cache_.find(dataset_id);
    if (it != metadata_cache_.end()) {
        Logger::debug("Returning column metadata for dataset {} from cache.", dataset_id);
        return it->second;
    }

    // If not in cache, load data and infer
    auto data_opt = getOrLoadData(dataset_id, filepath);
    if (!data_opt) {
        Logger::error("Could not load data to infer columns for dataset ID {}.", dataset_id);
        return std::nullopt;
    }
    
    std::vector<ColumnMetadata> inferred_columns = inferColumns(data_opt.value());
    metadata_cache_[dataset_id] = inferred_columns; // Cache it
    return inferred_columns;
}


std::optional<DataTable> DatasetManager::getOrLoadData(int dataset_id, const std::string& filepath) {
    auto it = data_cache_.find(dataset_id);
    if (it != data_cache_.end()) {
        Logger::debug("Returning data for dataset {} from cache.", dataset_id);
        return it->second;
    }

    // Load from file if not in cache
    auto data_opt = loadCsvFile(filepath);
    if (data_opt) {
        data_cache_[dataset_id] = data_opt.value(); // Cache it
        Logger::info("Data for dataset {} loaded from file and cached.", dataset_id);
    } else {
        Logger::error("Failed to load data for dataset {} from file {}.", dataset_id, filepath);
    }
    return data_opt;
}

void DatasetManager::clearCache(int dataset_id) {
    data_cache_.erase(dataset_id);
    metadata_cache_.erase(dataset_id);
    Logger::info("Cache cleared for dataset ID: {}", dataset_id);
}
```