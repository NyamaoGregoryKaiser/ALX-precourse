```cpp
#include "DataProcessor.h"
#include "util/ErrorHandler.h"
#include "core/common/Constants.h" // For DataType mapping

#include <cmath> // For std::isnan

namespace VisuFlow {
namespace Data {
namespace Processor {

DataProcessor::DataProcessor() {
    VisuFlow::Util::Logger::log(spdlog::level::info, "DataProcessor initialized.");
}

Model::DataTable DataProcessor::processData(const Model::DataTable& inputTable, const ProcessingConfig& config) {
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Starting data processing with config: groupBy={}, metric={}",
                                config.groupByColumn, config.metricColumn);

    // 1. Apply Filters
    Model::DataTable filteredTable = filterData(inputTable, config.filters);
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Filtered data: {} rows remaining.", filteredTable.rows.size());

    // 2. Group and Aggregate
    Model::DataTable aggregatedTable = groupAndAggregate(
        filteredTable, config.groupByColumn, config.metricColumn, config.aggregationType
    );
    VisuFlow::Util::Logger::log(spdlog::level::debug, "Aggregated data: {} rows generated.", aggregatedTable.rows.size());

    return aggregatedTable;
}

Model::DataTable DataProcessor::filterData(const Model::DataTable& inputTable, const std::map<std::string, std::string>& filters) {
    if (filters.empty()) {
        return inputTable; // No filters to apply
    }

    Model::DataTable filteredTable = inputTable; // Copy columns
    filteredTable.rows.clear(); // Clear rows to add filtered ones

    std::map<std::string, int> filterColumnIndices;
    for (const auto& filter : filters) {
        filterColumnIndices[filter.first] = getColumnIndex(inputTable, filter.first);
    }

    for (const auto& row : inputTable.rows) {
        bool passesFilters = true;
        for (const auto& filter : filters) {
            int colIndex = filterColumnIndices.at(filter.first);
            const Model::DataCellValue& cellValue = row.at(colIndex);

            std::string cellStringValue;
            // Convert variant to string for comparison
            if (std::holds_alternative<std::string>(cellValue)) {
                cellStringValue = std::get<std::string>(cellValue);
            } else if (std::holds_alternative<long long>(cellValue)) {
                cellStringValue = std::to_string(std::get<long long>(cellValue));
            } else if (std::holds_alternative<double>(cellValue)) {
                cellStringValue = std::to_string(std::get<double>(cellValue));
            } else if (std::holds_alternative<bool>(cellValue)) {
                cellStringValue = std::get<bool>(cellValue) ? "true" : "false";
            } else {
                cellStringValue = ""; // Handle unknown types
            }

            if (cellStringValue != filter.second) {
                passesFilters = false;
                break;
            }
        }
        if (passesFilters) {
            filteredTable.rows.push_back(row);
        }
    }
    return filteredTable;
}

Model::DataTable DataProcessor::groupAndAggregate(const Model::DataTable& inputTable,
                                                   const std::string& groupByColumnName,
                                                   const std::string& metricColumnName,
                                                   const std::string& aggregationType) {
    Model::DataTable outputTable;

    int groupByColIndex = getColumnIndex(inputTable, groupByColumnName);
    int metricColIndex = getColumnIndex(inputTable, metricColumnName);

    // Output table columns: GroupBy column, Aggregated Metric column
    outputTable.columns.push_back(inputTable.columns.at(groupByColIndex));
    outputTable.columns.push_back({metricColumnName + "_" + aggregationType, Model::DataType::DOUBLE}); // Aggregated metric is usually double

    // Map to store aggregated results: GroupKey -> {count, sum, min, max} for aggregation
    std::map<std::string, std::tuple<long long, double, double, double>> aggregates; // count, sum, min, max

    for (const auto& row : inputTable.rows) {
        // Extract group key
        const auto& groupByValue = row.at(groupByColIndex);
        std::string groupKey;
        if (std::holds_alternative<std::string>(groupByValue)) groupKey = std::get<std::string>(groupByValue);
        else if (std::holds_alternative<long long>(groupByValue)) groupKey = std::to_string(std::get<long long>(groupByValue));
        else if (std::holds_alternative<double>(groupByValue)) groupKey = std::to_string(std::get<double>(groupByValue));
        else groupKey = "UnknownGroup"; // Fallback for other types

        // Extract metric value
        const auto& metricValueCell = row.at(metricColIndex);
        double metricValue = 0.0;
        if (std::holds_alternative<long long>(metricValueCell)) {
            metricValue = static_cast<double>(std::get<long long>(metricValueCell));
        } else if (std::holds_alternative<double>(metricValueCell)) {
            metricValue = std::get<double>(metricValueCell);
        } else {
            // Handle cases where metric column is not numeric, or log warning
            VisuFlow::Util::Logger::log(spdlog::level::warn, "Metric column '{}' is not numeric. Skipping row.", metricColumnName);
            continue;
        }

        auto& agg = aggregates[groupKey]; // Get or create aggregate entry
        std::get<0>(agg)++; // Increment count

        if (std::get<0>(agg) == 1) { // First value for this group
            std::get<1>(agg) = metricValue; // Sum
            std::get<2>(agg) = metricValue; // Min
            std::get<3>(agg) = metricValue; // Max
        } else {
            std::get<1>(agg) += metricValue; // Sum
            std::get<2>(agg) = std::min(std::get<2>(agg), metricValue); // Min
            std::get<3>(agg) = std::max(std::get<3>(agg), metricValue); // Max
        }
    }

    // Populate output table from aggregates
    for (const auto& pair : aggregates) {
        Model::DataRow newRow;
        newRow.push_back(pair.first); // Group key

        double aggregatedValue = 0.0;
        long long count = std::get<0>(pair.second);
        double sum = std::get<1>(pair.second);
        double minVal = std::get<2>(pair.second);
        double maxVal = std::get<3>(pair.second);

        if (aggregationType == "sum") {
            aggregatedValue = sum;
        } else if (aggregationType == "avg") {
            aggregatedValue = (count > 0) ? (sum / count) : 0.0;
        } else if (aggregationType == "count") {
            aggregatedValue = static_cast<double>(count);
        } else if (aggregationType == "min") {
            aggregatedValue = minVal;
        } else if (aggregationType == "max") {
            aggregatedValue = maxVal;
        } else {
            VisuFlow::Util::Logger::log(spdlog::level::warn, "Unsupported aggregation type: {}. Defaulting to sum.", aggregationType);
            aggregatedValue = sum;
        }
        newRow.push_back(aggregatedValue);
        outputTable.rows.push_back(newRow);
    }

    return outputTable;
}

int DataProcessor::getColumnIndex(const Model::DataTable& table, const std::string& columnName) {
    for (size_t i = 0; i < table.columns.size(); ++i) {
        if (table.columns[i].name == columnName) {
            return static_cast<int>(i);
        }
    }
    throw VisuFlow::Util::APIException("Column not found: " + columnName, 400);
}

} // namespace Processor
} // namespace Data
} // namespace VisuFlow
```