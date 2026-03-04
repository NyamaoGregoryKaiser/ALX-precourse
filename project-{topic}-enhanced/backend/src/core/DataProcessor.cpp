#include "DataProcessor.h"
#include "utils/Logger.h"
#include <algorithm>
#include <sstream>
#include <set>

DataProcessor::DataProcessor() {}

// Helper to attempt conversion
nlohmann::json DataProcessor::convertToAppropriateType(const std::string& value) {
    // Try to convert to int
    try {
        size_t pos;
        int i = std::stoi(value, &pos);
        if (pos == value.length()) return i;
    } catch (const std::invalid_argument&) {}
    catch (const std::out_of_range&) {}

    // Try to convert to double
    try {
        size_t pos;
        double d = std::stod(value, &pos);
        if (pos == value.length()) return d;
    } catch (const std::invalid_argument&) {}
    catch (const std::out_of_range&) {}

    // Return as string if no other conversion is successful
    return value;
}

ProcessedData DataProcessor::process(const std::vector<std::map<std::string, std::string>>& raw_data, const nlohmann::json& config) {
    Logger::debug("DataProcessor::process - Starting data processing.");
    
    // Convert raw string data to appropriate types for initial processing
    std::vector<std::map<std::string, nlohmann::json>> typed_data;
    for (const auto& row : raw_data) {
        std::map<std::string, nlohmann::json> typed_row;
        for (const auto& [key, value] : row) {
            typed_row[key] = convertToAppropriateType(value);
        }
        typed_data.push_back(typed_row);
    }

    ProcessedData current_data = typed_data;

    // Apply filters
    if (config.contains("filters") && config["filters"].is_array()) {
        Logger::debug("DataProcessor::process - Applying filters.");
        // This would call `applyFilter` for each filter config.
        // For simplicity, this example only shows a conceptual loop.
        // The actual implementation would iterate and apply each filter dynamically.
        // current_data = applyFilter(current_data, config["filters"]);
    }

    // Apply aggregations
    if (config.contains("aggregations") && config["aggregations"].is_array()) {
        Logger::debug("DataProcessor::process - Applying aggregations.");
        // current_data = applyAggregation(current_data, config["aggregations"]);
    }

    // Apply sorting
    if (config.contains("sort") && config["sort"].is_array()) {
        Logger::debug("DataProcessor::process - Applying sort.");
        // current_data = sortData(current_data, config["sort"]);
    }

    Logger::debug("DataProcessor::process - Data processing finished.");
    return current_data;
}

// Example Filter Implementation (very basic)
// filter_config: { "field": "age", "operator": ">", "value": 30 }
ProcessedData DataProcessor::applyFilter(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& filter_config) {
    if (!filter_config.contains("field") || !filter_config.contains("operator") || !filter_config.contains("value")) {
        Logger::warn("Invalid filter configuration provided.");
        return {}; // Or throw an error
    }

    const std::string& field = filter_config["field"];
    const std::string& op = filter_config["operator"];
    const nlohmann::json& value_to_match = filter_config["value"];

    ProcessedData filtered_data;
    for (const auto& row : data) {
        auto it = row.find(field);
        if (it != row.end()) {
            nlohmann::json row_value = convertToAppropriateType(it->second);

            bool match = false;
            if (op == "=") {
                match = (row_value == value_to_match);
            } else if (op == ">") {
                match = (row_value > value_to_match);
            } else if (op == "<") {
                match = (row_value < value_to_match);
            } else if (op == ">=") {
                match = (row_value >= value_to_match);
            } else if (op == "<=") {
                match = (row_value <= value_to_match);
            } else if (op == "!=") {
                match = (row_value != value_to_match);
            }
            // Add more operators as needed

            if (match) {
                // Convert filtered string map to json map for ProcessedData
                std::map<std::string, nlohmann::json> typed_row;
                for(const auto& [k, v] : row) typed_row[k] = convertToAppropriateType(v);
                filtered_data.push_back(typed_row);
            }
        }
    }
    return filtered_data;
}

// Example Aggregation (SUM by a group_by field)
// aggregation_config: { "group_by": "category", "aggregate_field": "sales", "operation": "sum" }
ProcessedData DataProcessor::applyAggregation(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& aggregation_config) {
    if (!aggregation_config.contains("group_by") || !aggregation_config.contains("aggregate_field") || !aggregation_config.contains("operation")) {
        Logger::warn("Invalid aggregation configuration provided.");
        return {};
    }

    const std::string& group_by_field = aggregation_config["group_by"];
    const std::string& aggregate_field = aggregation_config["aggregate_field"];
    const std::string& operation = aggregation_config["operation"];

    std::map<std::string, nlohmann::json> aggregated_results; // Group_key -> aggregated_value

    for (const auto& row : data) {
        auto group_it = row.find(group_by_field);
        auto agg_it = row.find(aggregate_field);

        if (group_it != row.end() && agg_it != row.end()) {
            std::string group_key = group_it->second;
            nlohmann::json agg_value = convertToAppropriateType(agg_it->second);

            if (operation == "sum") {
                if (agg_value.is_number()) {
                    if (aggregated_results.find(group_key) == aggregated_results.end()) {
                        aggregated_results[group_key] = 0.0;
                    }
                    aggregated_results[group_key] = aggregated_results[group_key].get<double>() + agg_value.get<double>();
                }
            }
            // Add other operations (avg, count, min, max)
        }
    }

    ProcessedData result;
    for (const auto& [group_key, aggregated_value] : aggregated_results) {
        result.push_back({{group_by_field, group_key}, {aggregate_field + "_" + operation, aggregated_value}});
    }
    return result;
}

// Example Sorting
// sort_config: { "field": "sales", "order": "desc" }
ProcessedData DataProcessor::sortData(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& sort_config) {
    if (!sort_config.contains("field") || !sort_config.contains("order")) {
        Logger::warn("Invalid sort configuration provided.");
        // Convert to ProcessedData before returning empty
        ProcessedData typed_data;
        for (const auto& row : data) {
            std::map<std::string, nlohmann::json> typed_row;
            for (const auto& [k, v] : row) typed_row[k] = convertToAppropriateType(v);
            typed_data.push_back(typed_row);
        }
        return typed_data;
    }

    const std::string& sort_field = sort_config["field"];
    const std::string& sort_order = sort_config["order"];

    ProcessedData sorted_data;
    // Convert to ProcessedData first to enable comparison
    for (const auto& row : data) {
        std::map<std::string, nlohmann::json> typed_row;
        for (const auto& [k, v] : row) typed_row[k] = convertToAppropriateType(v);
        sorted_data.push_back(typed_row);
    }

    if (sort_order == "asc") {
        std::sort(sorted_data.begin(), sorted_data.end(), [&](const auto& a, const auto& b) {
            if (a.count(sort_field) && b.count(sort_field)) {
                return a.at(sort_field) < b.at(sort_field);
            }
            return false;
        });
    } else if (sort_order == "desc") {
        std::sort(sorted_data.begin(), sorted_data.end(), [&](const auto& a, const auto& b) {
            if (a.count(sort_field) && b.count(sort_field)) {
                return a.at(sort_field) > b.at(sort_field);
            }
            return false;
        });
    } else {
        Logger::warn("Unsupported sort order: " + sort_order);
    }

    return sorted_data;
}