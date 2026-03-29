```cpp
#ifndef DATAVIZ_DATAPROCESSOR_H
#define DATAVIZ_DATAPROCESSOR_H

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <nlohmann/json.hpp>
#include "../utils/Logger.h"
#include "DatasetManager.h" // For DataTable and ColumnMetadata

// Structs for defining data processing requests
struct FilterCondition {
    std::string column;
    std::string operator_type; // e.g., "=", ">", "<", "contains", "in"
    std::string value;         // Value to compare against
    nlohmann::json values;     // For "in" operator (array of values)
};

struct Aggregation {
    std::string column;
    std::string function; // e.g., "count", "sum", "avg", "min", "max"
    std::string alias;    // Name for the aggregated column
};

struct GroupBy {
    std::string column;
    std::string alias; // Alias for the group by column in output
};

struct SortOrder {
    std::string column;
    std::string direction; // "asc" or "desc"
};

// Represents a data request for visualization
struct DataRequest {
    int dataset_id;
    std::vector<FilterCondition> filters;
    std::vector<GroupBy> group_by;
    std::vector<Aggregation> aggregations;
    std::vector<SortOrder> sort_by;
    int limit; // Max number of rows to return

    static std::optional<DataRequest> fromJson(const nlohmann::json& j);
};

// Represents a processed data response
struct ProcessedData {
    std::vector<std::map<std::string, nlohmann::json>> rows; // Can contain mixed types, use json for values
    std::vector<ColumnMetadata> inferred_columns; // Actual types of returned columns

    nlohmann::json toJson() const;
};


class DataProcessor {
private:
    // Helper to convert string to appropriate type for comparison
    template<typename T>
    T convertValue(const std::string& str) {
        if constexpr (std::is_same_v<T, int>) return std::stoi(str);
        if constexpr (std::is_same_v<T, double>) return std::stod(str);
        if constexpr (std::is_same_v<T, std::string>) return str;
        return str; // Fallback
    }

    // Helper to evaluate a filter condition
    bool evaluateFilter(const std::map<std::string, std::string>& row, const FilterCondition& filter, const std::map<std::string, std::string>& column_types);
    std::map<std::string, std::string> getColumnTypeMap(const std::vector<ColumnMetadata>& metadata);

public:
    DataProcessor() = default;

    // Core processing function
    std::optional<ProcessedData> processData(const DataTable& raw_data, const std::vector<ColumnMetadata>& columns_metadata, const DataRequest& request);

private:
    // Processing steps
    DataTable applyFilters(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata, const std::vector<FilterCondition>& filters);
    DataTable applyGroupBysAndAggregations(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata,
                                         const std::vector<GroupBy>& group_by, const std::vector<Aggregation>& aggregations);
    DataTable applySorts(const DataTable& data, const std::vector<ColumnMetadata>& columns_metadata, const std::vector<SortOrder>& sort_by);

    // Type casting utilities (more robust than `inferColumnType` for specific processing needs)
    std::optional<double> tryParseDouble(const std::string& s);
    std::optional<long long> tryParseLong(const std::string& s);
};

#endif // DATAVIZ_DATAPROCESSOR_H
```