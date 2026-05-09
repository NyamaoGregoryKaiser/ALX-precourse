```cpp
#ifndef VISUFLOW_DATA_TRANSFER_OBJECTS_H
#define VISUFLOW_DATA_TRANSFER_OBJECTS_H

#include <string>
#include <vector>
#include <map>
#include <variant> // For std::variant in DataRow

namespace VisuFlow {
namespace API {

// --- Authentication DTOs ---
struct LoginRequest {
    std::string username;
    std::string password;
};

struct LoginResponse {
    std::string token;
    long long userId;
    std::string username;
    std::string role;
};

// --- Data Source DTOs ---
struct DataSourceCreateRequest {
    std::string name;
    std::string type; // e.g., "PostgreSQL", "CSV", "API"
    std::string connectionString;
    std::string query; // SQL query or API endpoint config
};

struct DataSourceInfoResponse {
    long long id;
    std::string name;
    std::string type;
    std::string connectionString;
    std::string query;
};

// --- Data Visualization DTOs ---
// Represents a single cell value, could be string, int, double, bool
using DataCellValue = std::variant<std::string, long long, double, bool>;

struct DataColumnInfo {
    std::string name;
    std::string type; // "string", "int", "double", "bool"
};

// Represents a row of data where each element is a variant
using DataRow = std::vector<DataCellValue>;

struct ProcessedDataResponse {
    std::vector<DataColumnInfo> columns;
    std::vector<DataRow> data;
};

// --- Dashboard DTOs ---
struct DashboardCreateRequest {
    std::string name;
    std::string description;
    std::string layoutJson; // JSON string describing dashboard layout and widgets
};

struct DashboardUpdateRequest {
    long long id;
    std::string name;
    std::string description;
    std::string layoutJson;
};

struct DashboardInfoResponse {
    long long id;
    std::string name;
    std::string description;
    std::string layoutJson;
    long long userId;
};

} // namespace API
} // namespace VisuFlow

#endif // VISUFLOW_DATA_TRANSFER_OBJECTS_H
```