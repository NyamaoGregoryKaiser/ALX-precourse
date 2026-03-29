```cpp
#include "DataProcessor.h"
#include <numeric> // For std::accumulate
#include <cmath>   // For std::round
#include <set>

// --- DataRequest parsing from JSON ---
std::optional<DataRequest> DataRequest::fromJson(const nlohmann::json& j) {
    DataRequest req;
    try {
        req.dataset_id = j.at("datasetId").get<int>();

        if (j.contains("filters") && j.at("filters").is_array()) {
            for (const auto& f_json : j.at("filters")) {
                FilterCondition fc;
                fc.column = f_json.at("column").get<std::string>();
                fc.operator_type = f_json.at("operator").get<std::string>();
                if (f_json.contains("value")) {
                    fc.value = f_json.at("value").get<std::string>();
                }
                if (f_json.contains("values") && f_json.at("values").is_array()) {
                    fc.values = f_json.at("values");
                }
                req.filters.push_back(fc);
            }
        }

        if (j.contains("groupBy") && j.at("groupBy").is_array()) {
            for (const auto& g_json : j.at("groupBy")) {
                GroupBy gb;
                gb.column = g_json.at("column").get<std::string>();
                gb.alias = g_json.value("alias", gb.column);
                req.group_by.push_back(gb);
            }
        }

        if (j.contains("aggregations") && j.at("aggregations").is_array()) {
            for (const auto& a_json : j.at("aggregations")) {
                Aggregation agg;
                agg.column = a_json.at("column").get<std::string>();
                agg.function = a_json.at("function").get<std::string>();
                agg.alias = a_json.value("alias", agg.function + "_" + agg.column);
                req.aggregations.push_back(agg);
            }
        }

        if (j.contains("sortBy") && j.at("sortBy").is_array()) {
            for (const auto& s_json : j.at("sortBy")) {
                SortOrder so;
                so.column = s_json.at("column").get<std::string>();
                so.direction = s_json.value("direction", "asc");
                req.sort_by.push_back(so);
            }
        }

        req.limit = j.value("limit", 0); // 0 means no limit

        return req;
    } catch (const nlohmann::json::exception& e) {
        Logger::error("Failed to parse DataRequest from JSON: {}", e.what());
        return std::nullopt;
    }
}

// --- ProcessedData to JSON ---
nlohmann::json ProcessedData::toJson() const {
    nlohmann::json j;
    j["rows"] = nlohmann::json::array();
    for (const auto& row_map : rows) {
        nlohmann::json row_j;
        for (const auto& pair : row_map) {
            row_j[pair.first] = pair.second; // nlohmann::json can handle json values directly
        }
        j["rows"].push_back(row_j);
    }

    nlohmann::json cols_json = nlohmann::json::array();
    for (const auto& col : inferred_columns) {
        cols_json.push_back(col.toJson());
    }
    j["columns"] = cols_json;
    return j;
}

// --- DataProcessor Implementation ---

std::map<std::string, std::string> DataProcessor::getColumnTypeMap(const std::vector<ColumnMetadata>& metadata) {
    std::map<std::string, std::string> type_map;
    for (const auto& col : metadata) {
        type_map[col.name] = col.type;
    }
    return type_map;
}


bool DataProcessor::evaluateFilter(const std::map<std::string, std::string>& row, const FilterCondition& filter, const std::map<std::string, std::string>& column_types) {
    auto it = row.find(filter.column);
    if (it == row.end()) {
        Logger::warn("Filter column '{}' not found in row.", filter.column);
        return false; // Column not present, filter fails
    }
    std::string row_value_str = it->second;
    std::string column_type = column_types.count(filter.column) ? column_types.at(filter.column) : "string";

    // Convert values based on column type for comparison
    if (column_type == "number") {
        std::optional<double> row_value_num = tryParseDouble(row_value_str);
        std::optional<double> filter_value_num = tryParseDouble(filter.value);

        if (!row_value_num || !filter_value_num) return false; // Cannot compare if not numbers

        if (filter.operator_type == "=") return row_value_num == filter_value_num;
        if (filter.operator_type == ">") return row_value_num > filter_value_num;
        if (filter.operator_type == "<") return row_value_num < filter_value_num;
        if (filter.operator_type == ">=") return row_value_num >= filter_value_num;
        if (filter.operator_type == "<=") return row_value_num <= filter_value_num;
    } else if (column_type == "string") {
        // Case-insensitive comparison for strings
        std::string lower_row_value = row_value_str;
        std::string lower_filter_value = filter.value;
        std::transform(lower_row_value.begin(), lower_row_value.end(), lower_row_value.begin(), ::tolower);
        std::transform(lower_filter_value.begin(), lower_filter_value.end(), lower_filter_value.begin(), ::tolower);

        if (filter.operator_type == "=") return lower_row_value == lower_filter_value;
        if (filter.operator_type == "contains") return lower_row_value.find(lower_filter_value) != std::string::npos;
        if (filter.operator_type == "in" && filter.values.is_array()) {
            for (const auto& val : filter.values) {
                if (val.is_string()) {
                    std::string lower_val_str = val.get<std::string>();
                    std::transform(lower_val_str.begin(), lower_val_str.end(), lower_val_str.begin(), ::tolower);
                    if (lower_row_value == lower_val_str) return true;
                }
            }
            return false;
        }
    }
    // Date comparison would go here. For now, treat as string.

    Logger::warn("Unsupported filter operator '{}' or type '{}' for column '{}'.", filter.operator_type, column_type, filter.column);
    return false; // Unknown operator or type
}

std::optional<ProcessedData> DataProcessor::processData(const DataTable& raw_data, const std::vector<ColumnMetadata>& columns_metadata, const DataRequest& request) {
    Logger::info("Starting data processing for dataset ID {}", request.dataset_id);
    if (raw_data.empty()) {
        Logger::warn("Raw data is empty for dataset ID {}.", request.dataset_id);
        return ProcessedData{};
    }

    DataTable processed_data = raw_data;
    std::vector<ColumnMetadata> current_columns_metadata = columns_metadata;

    // 1. Apply Filters
    if (!request.filters.empty()) {
        processed_data = applyFilters(processed_data, current_columns_metadata, request.filters);
        Logger::debug("Applied {} filters. Rows remaining: {}", request.filters.size(), processed_data.size());
    }

    // 2. Apply GroupBys and Aggregations
    if (!request.group_by.empty() || !request.aggregations.empty()) {
        processed_data = applyGroupBysAndAggregations(processed_data, current_columns_metadata, request.group_by, request.aggregations);
        
        // Update column metadata after aggregation
        std::vector<ColumnMetadata> new_metadata;
        for (const auto& gb : request.group_by) {
            auto it = std::find_if(columns_metadata.begin(), columns_metadata.end(),
                                   [&](const ColumnMetadata& col){ return col.name == gb.column; });
            if (it != columns_metadata.end()) {
                ColumnMetadata new_col = *it;
                new_col.name = gb.alias; // Use alias
                new_metadata.push_back(new_col);
            }
        }
        for (const auto& agg : request.aggregations) {
            // Aggregated columns are always measures and typically numbers
            new_metadata.push_back({agg.alias, "number", false, true});
        }
        current_columns_metadata = new_metadata; // Update for subsequent steps
        Logger::debug("Applied group by and aggregations. Resulting rows: {}", processed_data.size());
    }

    // 3. Apply Sorts
    if (!request.sort_by.empty()) {
        processed_data = applySorts(processed_data, current_columns_metadata, request.sort_by);
        Logger::debug("Applied {} sorts.", request.sort_by.size());
    }

    // 4. Apply Limit
    if (request.limit > 0 && processed_data.size() > static_cast<size_t>(request.limit)) {
        processed_data.resize(request.limit);
        Logger::debug("Applied limit of {}. Rows remaining: {}", request.limit, processed_data.size());
    }

    // Convert DataTable to ProcessedData's format (vector of maps with nlohmann::json values)
    ProcessedData final_data;
    final_data.inferred_columns = current_columns_metadata;

    for (const auto& row_map_str : processed_data) {
        std::map<std::string, nlohmann::json> row_map_json;
        for (const auto& col_meta : current_columns_metadata) {
            auto it = row_map_str.find(col_meta.name);
            if (it != row_map_str.end()) {
                if (col_meta.type == "number") {
                    auto val_opt = tryParseDouble(it->second);
                    row_map_json[col_meta.name] = val_opt ? nlohmann::json(*val_opt) : nlohmann::json();
                } else {
                    row_map_json[col_meta.name] = it->second;
                }
            } else {
                row_map_json[col_meta.name] = nlohmann::json(); // Column not found
            }
        }
        final_data.rows.push_back(row_map_json);
    }
    
    Logger::info("Data processing complete. Returned {} rows.", final_data.rows.size());
    return final_data;
}

DataTable DataProcessor::applyFilters(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata, const std::vector<FilterCondition>& filters) {
    DataTable filtered_data;
    std::map<std::string, std::string> column_types = getColumnTypeMap(columns_metadata);

    for (const auto& row : data) {
        bool passes_all_filters = true;
        for (const auto& filter : filters) {
            if (!evaluateFilter(row, filter, column_types)) {
                passes_all_filters = false;
                break;
            }
        }
        if (passes_all_filters) {
            filtered_data.push_back(row);
        }
    }
    return filtered_data;
}

DataTable DataProcessor::applyGroupBysAndAggregations(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata,
                                                   const std::vector<GroupBy>& group_by, const std::vector<Aggregation>& aggregations) {
    if (group_by.empty() && aggregations.empty()) {
        return data; // No group by or aggregation to apply
    }

    // Key for grouping: concatenation of group by column values
    std::map<std::string, std::vector<const std::map<std::string, std::string>*>> grouped_rows;

    if (group_by.empty()) { // Case: Aggregations without explicit group by (i.e., aggregate entire dataset)
        std::string single_group_key = "___overall_group___";
        for (const auto& row : data) {
            grouped_rows[single_group_key].push_back(&row);
        }
    } else {
        for (const auto& row : data) {
            std::string group_key;
            for (const auto& gb : group_by) {
                auto it = row.find(gb.column);
                if (it != row.end()) {
                    group_key += it->second + "::"; // Separator
                } else {
                    group_key += "NULL::"; // Handle missing columns in group key
                }
            }
            grouped_rows[group_key].push_back(&row);
        }
    }

    DataTable aggregated_data;
    std::map<std::string, std::string> column_types = getColumnTypeMap(columns_metadata);

    for (const auto& [key, rows_in_group] : grouped_rows) {
        std::map<std::string, std::string> aggregated_row;

        // Add group by columns to the aggregated row
        if (!group_by.empty()) {
            const auto& first_row_in_group = *rows_in_group[0]; // Take values from first row in group
            for (const auto& gb : group_by) {
                auto it = first_row_in_group.find(gb.column);
                if (it != first_row_in_group.end()) {
                    aggregated_row[gb.alias] = it->second;
                } else {
                    aggregated_row[gb.alias] = ""; // Or "NULL"
                }
            }
        }

        // Perform aggregations
        for (const auto& agg : aggregations) {
            std::vector<double> numeric_values;
            std::vector<std::string> string_values;
            bool is_numeric = column_types.count(agg.column) && column_types.at(agg.column) == "number";

            for (const auto* row_ptr : rows_in_group) {
                auto it = row_ptr->find(agg.column);
                if (it != row_ptr->end() && !it->second.empty()) {
                    if (is_numeric) {
                        if (auto val_opt = tryParseDouble(it->second)) {
                            numeric_values.push_back(*val_opt);
                        }
                    } else {
                        string_values.push_back(it->second);
                    }
                }
            }

            std::string result_str = "";
            if (agg.function == "count") {
                if (is_numeric) result_str = std::to_string(numeric_values.size());
                else result_str = std::to_string(string_values.size());
            } else if (is_numeric) {
                if (numeric_values.empty()) {
                    result_str = "0"; // Or nan
                } else if (agg.function == "sum") {
                    result_str = std::to_string(std::accumulate(numeric_values.begin(), numeric_values.end(), 0.0));
                } else if (agg.function == "avg") {
                    result_str = std::to_string(std::accumulate(numeric_values.begin(), numeric_values.end(), 0.0) / numeric_values.size());
                } else if (agg.function == "min") {
                    result_str = std::to_string(*std::min_element(numeric_values.begin(), numeric_values.end()));
                } else if (agg.function == "max") {
                    result_str = std::to_string(*std::max_element(numeric_values.begin(), numeric_values.end()));
                } else {
                    Logger::warn("Unsupported aggregation function '{}' for numeric column '{}'.", agg.function, agg.column);
                }
            } else {
                 Logger::warn("Aggregation function '{}' is not supported for non-numeric column '{}'.", agg.function, agg.column);
            }
            aggregated_row[agg.alias] = result_str;
        }
        aggregated_data.push_back(aggregated_row);
    }
    return aggregated_data;
}

DataTable DataProcessor::applySorts(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata, const std::vector<SortOrder>& sort_by) {
    DataTable sorted_data = data; // Make a copy to sort
    if (sort_by.empty()) {
        return sorted_data;
    }

    std::map<std::string, std::string> column_types = getColumnTypeMap(columns_metadata);

    std::sort(sorted_data.begin(), sorted_data.end(), [&](const auto& row_a, const auto& row_b) {
        for (const auto& sort_order : sort_by) {
            auto it_a = row_a.find(sort_order.column);
            auto it_b = row_b.find(sort_order.column);

            if (it_a == row_a.end() || it_b == row_b.end()) {
                // Handle cases where column is missing, e.g., push missing to end
                return false; // Or throw error
            }

            const std::string& val_a_str = it_a->second;
            const std::string& val_b_str = it_b->second;
            const std::string& col_type = column_types.count(sort_order.column) ? column_types.at(sort_order.column) : "string";

            bool less = false;
            bool equal = false;

            if (col_type == "number") {
                std::optional<double> num_a = tryParseDouble(val_a_str);
                std::optional<double> num_b = tryParseDouble(val_b_str);
                if (!num_a && !num_b) { equal = true; } // Both invalid numbers, treat as equal for sorting
                else if (!num_a) { return sort_order.direction == "asc"; } // Nulls/non-numbers go last
                else if (!num_b) { return sort_order.direction != "asc"; } // Nulls/non-numbers go last
                else {
                    less = *num_a < *num_b;
                    equal = *num_a == *num_b;
                }
            } else { // Treat as string
                less = val_a_str < val_b_str;
                equal = val_a_str == val_b_str;
            }

            if (!equal) {
                return (sort_order.direction == "asc") ? less : !less;
            }
        }
        return false; // All sort criteria are equal
    });

    return sorted_data;
}


std::optional<double> DataProcessor::tryParseDouble(const std::string& s) {
    if (s.empty()) return std::nullopt;
    try {
        size_t pos;
        double d = std::stod(s, &pos);
        if (pos == s.length()) { // Ensure the entire string was consumed
            return d;
        }
    } catch (...) {
        // Fall through
    }
    return std::nullopt;
}

std::optional<long long> DataProcessor::tryParseLong(const std::string& s) {
    if (s.empty()) return std::nullopt;
    try {
        size_t pos;
        long long l = std::stoll(s, &pos);
        if (pos == s.length()) { // Ensure the entire string was consumed
            return l;
        }
    } catch (...) {
        // Fall through
    }
    return std::nullopt;
}
```