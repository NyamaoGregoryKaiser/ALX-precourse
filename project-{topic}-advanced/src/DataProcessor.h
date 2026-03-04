```cpp
#ifndef VISGENIUS_DATA_PROCESSOR_H
#define VISGENIUS_DATA_PROCESSOR_H

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <variant> // For std::variant<int, double, std::string>

#include "Models.h"
#include "ErrorHandling.h"
#include "Logger.h"

namespace VisGenius {

// Define a cell value using variant for different types
using DataCellValue = std::variant<int, double, std::string>;

// Represents a row of data with column names mapping to values
using DataRow = std::map<std::string, DataCellValue>;

// Represents a table of data
struct DataTable {
    std::vector<std::string> column_names;
    std::vector<DataRow> rows;

    std::string to_string() const {
        std::ostringstream oss;
        for (const auto& col : column_names) {
            oss << col << "\t";
        }
        oss << "\n";
        for (const auto& row : rows) {
            for (const auto& col : column_names) {
                // Visit variant to print correct type
                std::visit([&oss](const auto& arg){ oss << arg; }, row.at(col));
                oss << "\t";
            }
            oss << "\n";
        }
        return oss.str();
    }
};

class DataProcessor {
public:
    DataProcessor();

    // Load data from a data source (e.g., CSV file)
    DataTable loadData(const DataSource& ds);

    // Apply filters to a DataTable
    // filter_config: map of column name to filter value/range/condition
    // e.g., {"column_name": "value", "age": ">30"}
    DataTable filterData(const DataTable& data, const std::map<std::string, std::string>& filter_config);

    // Aggregate data
    // aggregation_config: e.g., {"group_by": "category", "aggregate_column": "value", "operation": "sum"}
    DataTable aggregateData(const DataTable& data, const std::map<std::string, std::string>& aggregation_config);

    // Get schema from a data source (e.g., first few rows of CSV)
    std::vector<FieldDefinition> inferSchema(const DataSource& ds);

private:
    // Helper to parse CSV data
    DataTable parseCsv(const std::string& filepath, const std::vector<FieldDefinition>& schema);
    
    // Helper to convert string to DataCellValue based on inferred type
    DataCellValue convertStringToCellValue(const std::string& s, const std::string& type);
};

} // namespace VisGenius

#endif // VISGENIUS_DATA_PROCESSOR_H
```