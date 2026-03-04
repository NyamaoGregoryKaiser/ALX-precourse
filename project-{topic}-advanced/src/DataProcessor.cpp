```cpp
#include "DataProcessor.h"
#include <fstream>
#include <sstream>
#include <algorithm> // For std::remove_if
#include <charconv> // For std::from_chars (C++17 for performance)

namespace VisGenius {

DataProcessor::DataProcessor() {
    // Constructor, no specific initialization needed for now
}

DataTable DataProcessor::loadData(const DataSource& ds) {
    LOG_INFO("Loading data from data source ID: {}, Name: {}", ds.id, ds.name);
    if (ds.type == "csv") {
        return parseCsv(ds.connection_string, ds.schema);
    } else {
        throw DataProcessingException("Unsupported data source type: " + ds.type);
    }
}

DataTable DataProcessor::filterData(const DataTable& data, const std::map<std::string, std::string>& filter_config) {
    if (filter_config.empty()) {
        return data; // No filters, return original data
    }

    LOG_INFO("Filtering data with config: {}", configMapToString(filter_config));
    DataTable filtered_data;
    filtered_data.column_names = data.column_names;

    for (const auto& row : data.rows) {
        bool passes_all_filters = true;
        for (const auto& filter_pair : filter_config) {
            const std::string& column_name = filter_pair.first;
            const std::string& filter_value_str = filter_pair.second;

            if (row.find(column_name) == row.end()) {
                LOG_WARN("Filter column '{}' not found in data row. Skipping filter.", column_name);
                passes_all_filters = false; // Or handle as an error
                break;
            }

            // Simple filter logic: direct equality or basic numeric comparison
            // This needs to be robust for production (e.g., regex, range, less/greater than)
            const DataCellValue& cell_value = row.at(column_name);
            bool row_passes_filter = false;

            // Simple equality check for now
            std::string cell_str_val;
            std::visit([&cell_str_val](const auto& arg){ cell_str_val = std::to_string(arg); }, cell_value);
            
            // Handle numeric comparisons
            if (filter_value_str.length() > 1 && (filter_value_str[0] == '>' || filter_value_str[0] == '<' || filter_value_str[0] == '=')) {
                try {
                    char op = filter_value_str[0];
                    std::string val_str = filter_value_str.substr(1);
                    double filter_val = std::stod(val_str);

                    if (std::holds_alternative<int>(cell_value)) {
                        double cell_d_val = static_cast<double>(std::get<int>(cell_value));
                        if ((op == '>' && cell_d_val > filter_val) ||
                            (op == '<' && cell_d_val < filter_val) ||
                            (op == '=' && cell_d_val == filter_val)) {
                            row_passes_filter = true;
                        }
                    } else if (std::holds_alternative<double>(cell_value)) {
                        double cell_d_val = std::get<double>(cell_value);
                        if ((op == '>' && cell_d_val > filter_val) ||
                            (op == '<' && cell_d_val < filter_val) ||
                            (op == '=' && cell_d_val == filter_val)) {
                            row_passes_filter = true;
                        }
                    } else {
                        // Numeric filter on non-numeric column, treat as not passing
                        row_passes_filter = false;
                    }
                } catch (const std::exception& e) {
                    LOG_WARN("Failed to parse numeric filter '{}' for column '{}': {}", filter_value_str, column_name, e.what());
                    row_passes_filter = false; // Treat as not passing filter
                }
            } else {
                // Default to string equality if not a numeric comparison
                if (cell_str_val == filter_value_str) {
                    row_passes_filter = true;
                }
            }
            
            if (!row_passes_filter) {
                passes_all_filters = false;
                break;
            }
        }
        if (passes_all_filters) {
            filtered_data.rows.push_back(row);
        }
    }
    LOG_INFO("Filtered data, original {} rows, new {} rows.", data.rows.size(), filtered_data.rows.size());
    return filtered_data;
}

DataTable DataProcessor::aggregateData(const DataTable& data, const std::map<std::string, std::string>& aggregation_config) {
    LOG_INFO("Aggregating data with config: {}", configMapToString(aggregation_config));

    std::string group_by_col;
    std::string aggregate_col;
    std::string operation; // sum, count, avg, min, max

    auto it_group = aggregation_config.find("group_by");
    if (it_group != aggregation_config.end()) group_by_col = it_group->second;

    auto it_agg_col = aggregation_config.find("aggregate_column");
    if (it_agg_col != aggregation_config.end()) aggregate_col = it_agg_col->second;

    auto it_op = aggregation_config.find("operation");
    if (it_op != aggregation_config.end()) operation = it_op->second;

    if (operation.empty() || aggregate_col.empty()) {
        throw InvalidInputException("Aggregation operation and aggregate_column are required.");
    }

    if (std::find(data.column_names.begin(), data.column_names.end(), aggregate_col) == data.column_names.end()) {
        throw InvalidInputException("Aggregate column '" + aggregate_col + "' not found in data.");
    }
    if (!group_by_col.empty() && std::find(data.column_names.begin(), data.column_names.end(), group_by_col) == data.column_names.end()) {
        throw InvalidInputException("Group by column '" + group_by_col + "' not found in data.");
    }

    DataTable aggregated_data;
    aggregated_data.column_names.push_back(group_by_col.empty() ? "Total" : group_by_col);
    aggregated_data.column_names.push_back(operation + "_" + aggregate_col);

    // Grouping logic
    std::map<std::string, std::vector<double>> groups;
    std::map<std::string, int> counts; // For average

    for (const auto& row : data.rows) {
        std::string group_key = group_by_col.empty() ? "TOTAL" : 
                                 std::visit([](const auto& arg){ return std::to_string(arg); }, row.at(group_by_col));

        // Attempt to convert aggregate column value to double
        double value;
        try {
            if (std::holds_alternative<int>(row.at(aggregate_col))) {
                value = static_cast<double>(std::get<int>(row.at(aggregate_col)));
            } else if (std::holds_alternative<double>(row.at(aggregate_col))) {
                value = std::get<double>(row.at(aggregate_col));
            } else {
                // If not numeric, skip for sum/avg, or count if operation is count
                if (operation != "count") {
                    LOG_WARN("Skipping non-numeric value in aggregation column '{}' for group '{}'.", aggregate_col, group_key);
                    continue;
                }
                value = 1.0; // For count operation, treat each row as 1
            }
        } catch (const std::bad_variant_access& e) {
            LOG_WARN("Error accessing variant for aggregate column '{}' in group '{}': {}", aggregate_col, group_key, e.what());
            continue;
        } catch (const std::exception& e) {
            LOG_WARN("Error converting aggregate column '{}' to number for group '{}': {}", aggregate_col, group_key, e.what());
            continue;
        }

        groups[group_key].push_back(value);
        counts[group_key]++;
    }

    // Perform aggregation
    for (const auto& pair : groups) {
        const std::string& group_key = pair.first;
        const std::vector<double>& values = pair.second;
        double aggregated_value = 0.0;

        if (operation == "sum") {
            for (double val : values) aggregated_value += val;
        } else if (operation == "count") {
            aggregated_value = static_cast<double>(counts[group_key]);
        } else if (operation == "avg") {
            for (double val : values) aggregated_value += val;
            if (counts[group_key] > 0) aggregated_value /= counts[group_key];
            else aggregated_value = 0.0;
        } else if (operation == "min") {
            if (!values.empty()) {
                aggregated_value = values[0];
                for (double val : values) aggregated_value = std::min(aggregated_value, val);
            }
        } else if (operation == "max") {
            if (!values.empty()) {
                aggregated_value = values[0];
                for (double val : values) aggregated_value = std::max(aggregated_value, val);
            }
        } else {
            throw InvalidInputException("Unsupported aggregation operation: " + operation);
        }

        DataRow aggregated_row;
        aggregated_row[group_by_col.empty() ? "Total" : group_by_col] = group_key;
        aggregated_row[operation + "_" + aggregate_col] = aggregated_value;
        aggregated_data.rows.push_back(aggregated_row);
    }
    LOG_INFO("Aggregation complete. Resulting data has {} rows.", aggregated_data.rows.size());
    return aggregated_data;
}

std::vector<FieldDefinition> DataProcessor::inferSchema(const DataSource& ds) {
    LOG_INFO("Inferring schema for data source ID: {}, Name: {}", ds.id, ds.name);
    if (ds.type != "csv") {
        throw DataProcessingException("Schema inference only supported for CSV for now.");
    }

    std::ifstream file(ds.connection_string);
    if (!file.is_open()) {
        throw DataProcessingException("Failed to open file for schema inference: " + ds.connection_string);
    }

    std::string line;
    std::vector<FieldDefinition> schema;

    // Read header line
    if (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string cell;
        while (std::getline(ss, cell, ',')) {
            // Trim whitespace from column name
            cell.erase(std::remove_if(cell.begin(), cell.end(), ::isspace), cell.end());
            schema.push_back({cell, "string"}); // Default to string
        }
    } else {
        throw DataProcessingException("CSV file is empty, cannot infer schema.");
    }

    // Read a few more lines to infer types
    int rows_to_sample = 5;
    std::vector<std::vector<std::string>> sample_data;
    for (int i = 0; i < rows_to_sample && std::getline(file, line); ++i) {
        std::stringstream ss(line);
        std::string cell;
        std::vector<std::string> row_cells;
        while (std::getline(ss, cell, ',')) {
             cell.erase(std::remove_if(cell.begin(), cell.end(), ::isspace), cell.end()); // Trim
            row_cells.push_back(cell);
        }
        if (row_cells.size() == schema.size()) {
            sample_data.push_back(row_cells);
        } else {
             LOG_WARN("Row {} has {} columns, expected {}. Skipping for schema inference.", i + 1, row_cells.size(), schema.size());
        }
    }

    // Infer types based on sample data
    for (size_t i = 0; i < schema.size(); ++i) {
        bool all_int = true;
        bool all_double = true;

        if (sample_data.empty()) {
            schema[i].type = "string"; // If no sample data, default to string
            continue;
        }

        for (const auto& row : sample_data) {
            if (i >= row.size()) continue; // Should not happen if `row_cells.size() == schema.size()` check works
            const std::string& value = row[i];
            if (value.empty()) continue; // Empty cells don't help inference

            // Check for integer
            try {
                size_t pos;
                std::stoi(value, &pos);
                if (pos != value.length()) all_int = false;
            } catch (const std::exception&) {
                all_int = false;
            }

            // Check for double
            try {
                size_t pos;
                std::stod(value, &pos);
                if (pos != value.length()) all_double = false;
            } catch (const std::exception&) {
                all_double = false;
            }
        }

        if (all_int) {
            schema[i].type = "int";
        } else if (all_double) {
            schema[i].type = "double";
        } else {
            schema[i].type = "string"; // Default to string if neither int nor double, or mixed types
        }
    }
    LOG_INFO("Schema inferred: {} fields.", schema.size());
    return schema;
}

DataTable DataProcessor::parseCsv(const std::string& filepath, const std::vector<FieldDefinition>& schema) {
    LOG_INFO("Parsing CSV file: {}", filepath);
    std::ifstream file(filepath);
    if (!file.is_open()) {
        throw DataProcessingException("Failed to open CSV file: " + filepath);
    }

    DataTable data_table;
    std::string line;

    // Read header (and use it to set column_names if schema is empty, otherwise use schema names)
    if (std::getline(file, line)) {
        if (schema.empty()) { // Infer column names from header
            std::stringstream ss(line);
            std::string cell;
            while (std::getline(ss, cell, ',')) {
                cell.erase(std::remove_if(cell.begin(), cell.end(), ::isspace), cell.end()); // Trim
                data_table.column_names.push_back(cell);
            }
        } else { // Use schema column names
            for (const auto& field : schema) {
                data_table.column_names.push_back(field.name);
            }
        }
    } else {
        throw DataProcessingException("CSV file is empty.");
    }

    // Read data rows
    int row_count = 0;
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string cell_str;
        DataRow row;
        int col_idx = 0;
        
        while (std::getline(ss, cell_str, ',')) {
            if (col_idx < data_table.column_names.size()) {
                std::string column_name = data_table.column_names[col_idx];
                std::string col_type = "string"; // Default
                if (!schema.empty() && col_idx < schema.size()) {
                    col_type = schema[col_idx].type;
                }
                row[column_name] = convertStringToCellValue(cell_str, col_type);
            }
            col_idx++;
        }
        if (row.size() == data_table.column_names.size()) {
            data_table.rows.push_back(row);
            row_count++;
        } else {
            LOG_WARN("Skipping row {} due to column mismatch (expected {}, got {}).", row_count + 1, data_table.column_names.size(), row.size());
        }
    }
    LOG_INFO("Finished parsing CSV. Loaded {} rows.", row_count);
    return data_table;
}

DataCellValue DataProcessor::convertStringToCellValue(const std::string& s, const std::string& type) {
    if (type == "int") {
        try {
            return std::stoi(s);
        } catch (const std::exception&) {
            LOG_WARN("Failed to convert '{}' to int, treating as string.", s);
            return s;
        }
    } else if (type == "double") {
        try {
            return std::stod(s);
        } catch (const std::exception&) {
            LOG_WARN("Failed to convert '{}' to double, treating as string.", s);
            return s;
        }
    }
    // Default or if conversion fails
    return s;
}

} // namespace VisGenius
```