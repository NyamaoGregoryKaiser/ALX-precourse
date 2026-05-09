```cpp
#ifndef VISUFLOW_DATA_PROCESSOR_H
#define VISUFLOW_DATA_PROCESSOR_H

#include "data/model/DataModels.h"
#include "util/Logger.h"

#include <string>
#include <vector>
#include <map>
#include <algorithm>
#include <functional> // For std::function

namespace VisuFlow {
namespace Data {
namespace Processor {

/**
 * @brief Configuration struct for data processing operations.
 */
struct ProcessingConfig {
    std::string groupByColumn;          ///< Column to group by (e.g., "date", "category").
    std::string metricColumn;           ///< Column to aggregate (e.g., "sales", "revenue").
    std::string aggregationType;        ///< Type of aggregation: "sum", "avg", "count", "min", "max" (default: "sum").
    std::map<std::string, std::string> filters; ///< Key-value pairs for filtering (e.g., "region": "North").
    // Add more configurations as needed, e.g., sorting, pivots, custom calculations.

    ProcessingConfig() : aggregationType("sum") {}
};

/**
 * @brief Performs various data processing operations on a DataTable.
 * This includes filtering, grouping, aggregation, and transformations.
 */
class DataProcessor {
public:
    DataProcessor();

    /**
     * @brief Processes a raw DataTable based on the provided configuration.
     * Applies filters, then groups and aggregates data.
     * @param inputTable The raw DataTable to process.
     * @param config The processing configuration.
     * @return A new DataTable containing the processed results.
     * @throws std::runtime_error if processing fails (e.g., invalid column name).
     */
    Model::DataTable processData(const Model::DataTable& inputTable, const ProcessingConfig& config);

private:
    /**
     * @brief Filters rows from a DataTable based on specified criteria.
     * @param inputTable The table to filter.
     * @param filters Map of column names to filter values.
     * @return A new DataTable containing only the filtered rows.
     */
    Model::DataTable filterData(const Model::DataTable& inputTable, const std::map<std::string, std::string>& filters);

    /**
     * @brief Groups data by a specified column and aggregates a metric column.
     * @param inputTable The table to group.
     * @param groupByColumnName The name of the column to group by.
     * @param metricColumnName The name of the column to aggregate.
     * @param aggregationType The type of aggregation ("sum", "avg", "count", "min", "max").
     * @return A new DataTable with grouped and aggregated data.
     */
    Model::DataTable groupAndAggregate(const Model::DataTable& inputTable,
                                       const std::string& groupByColumnName,
                                       const std::string& metricColumnName,
                                       const std::string& aggregationType);

    // Helper to get column index by name
    int getColumnIndex(const Model::DataTable& table, const std::string& columnName);
};

} // namespace Processor
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_DATA_PROCESSOR_H
```