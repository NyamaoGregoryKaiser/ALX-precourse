```cpp
#ifndef VISUFLOW_DATA_MODELS_H
#define VISUFLOW_DATA_MODELS_H

#include <string>
#include <vector>
#include <map>
#include <variant> // For std::variant

namespace VisuFlow {
namespace Data {
namespace Model {

// --- Enumerations ---
enum class DataType {
    UNKNOWN,
    STRING,
    INT,
    DOUBLE,
    BOOL,
    DATETIME // For future use
};

// --- Core Data Structures ---

// Represents a single cell value in a DataTable
// Uses std::variant for type flexibility, allowing different primitive types.
using DataCellValue = std::variant<std::string, long long, double, bool>;

// Represents column metadata in a DataTable
struct DataColumn {
    std::string name;
    DataType type;
};

// Represents a single row of data in a DataTable
using DataRow = std::vector<DataCellValue>;

// Represents a table of data, with columns metadata and rows of values
struct DataTable {
    std::vector<DataColumn> columns;
    std::vector<DataRow> rows;
};

// --- Application-Specific Models ---

// User Model
struct User {
    long long id = 0; // 0 for uninitialized/not found
    std::string username;
    std::string hashedPassword; // Store hashed password, not plain text
    std::string email;
    std::string role; // e.g., "admin", "viewer", "editor"
    std::string createdAt; // ISO 8601 format
    std::string updatedAt; // ISO 8601 format
};

// DataSource Model
struct DataSource {
    long long id = 0; // 0 for uninitialized/not found
    std::string name;
    std::string type; // e.g., "PostgreSQL", "CSV", "API"
    std::string connectionString; // Database connection string, file path, API endpoint URL
    std::string query; // Default SQL query, file filter, API parameters
    long long userId; // Owner of the data source
    std::string createdAt;
    std::string updatedAt;
};

// Dashboard Model
struct Dashboard {
    long long id = 0; // 0 for uninitialized/not found
    std::string name;
    std::string description;
    std::string layoutJson; // JSON string describing widget positions, sizes, chart types, data mappings
    long long userId; // Owner of the dashboard
    std::string createdAt;
    std::string updatedAt;
};

} // namespace Model
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_DATA_MODELS_H
```