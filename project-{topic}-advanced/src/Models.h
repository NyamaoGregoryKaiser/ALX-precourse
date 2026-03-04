```cpp
#ifndef VISGENIUS_MODELS_H
#define VISGENIUS_MODELS_H

#include <string>
#include <vector>
#include <map>
#include <chrono> // For timestamps
#include <memory> // For shared_ptr

// Forward declarations for nlohmann::json (assuming it's a dependency)
// #include <nlohmann/json.hpp>
// namespace nlohmann { class json; }

// Using simple string types for now, would typically use nlohmann::json or similar
// for structured data in a real application.
// For simplicity, let's define structs directly.

namespace VisGenius {

// --- Basic Utility Structs ---
struct TimePoint {
    long long timestamp_ms; // Milliseconds since epoch
    std::string to_string() const {
        // Placeholder for real date/time formatting
        return std::to_string(timestamp_ms);
    }
};

struct FieldDefinition {
    std::string name;
    std::string type; // e.g., "string", "number", "date"
    // Other properties like 'is_nullable', 'default_value'
};

// --- Data Source Model ---
struct DataSource {
    int id = 0;
    std::string name;
    std::string type; // e.g., "csv", "sql"
    std::string connection_string; // Path to CSV, DB connection string
    TimePoint created_at;
    TimePoint updated_at;
    std::vector<FieldDefinition> schema; // Parsed schema from source

    // Converts DataSource to a string representation for logging/display
    std::string to_string() const {
        std::string s = "DataSource(ID: " + std::to_string(id) + ", Name: " + name + ", Type: " + type + ", Connection: " + connection_string + ", Created: " + created_at.to_string() + ", Updated: " + updated_at.to_string() + ")\nSchema:\n";
        for (const auto& field : schema) {
            s += "  - " + field.name + " (" + field.type + ")\n";
        }
        return s;
    }

    // Placeholder for JSON serialization (would use nlohmann::json)
    // nlohmann::json to_json() const { /* ... */ }
};

// --- Visualization Model ---
struct Visualization {
    int id = 0;
    std::string name;
    int data_source_id = 0;
    std::string type; // e.g., "bar", "line", "scatter", "table"
    std::map<std::string, std::string> config; // JSON string in DB, parsed to map here
                                              // e.g., {"x_axis": "column_a", "y_axis": "column_b", "aggregation": "sum"}
    TimePoint created_at;
    TimePoint updated_at;

    // Converts Visualization to a string representation
    std::string to_string() const {
        std::string s = "Visualization(ID: " + std::to_string(id) + ", Name: " + name + ", Type: " + type + ", DataSourceID: " + std::to_string(data_source_id) + ", Created: " + created_at.to_string() + ", Updated: " + updated_at.to_string() + ")\nConfig:\n";
        for (const auto& pair : config) {
            s += "  - " + pair.first + ": " + pair.second + "\n";
        }
        return s;
    }
};

// --- Dashboard Model ---
struct Dashboard {
    int id = 0;
    std::string name;
    std::string description;
    std::vector<int> visualization_ids; // IDs of visualizations on the dashboard
    TimePoint created_at;
    TimePoint updated_at;

    // Converts Dashboard to a string representation
    std::string to_string() const {
        std::string s = "Dashboard(ID: " + std::to_string(id) + ", Name: " + name + ", Desc: " + description + ", Created: " + created_at.to_string() + ", Updated: " + updated_at.to_string() + ")\nVisualizations: [";
        for (size_t i = 0; i < visualization_ids.size(); ++i) {
            s += std::to_string(visualization_ids[i]);
            if (i < visualization_ids.size() - 1) s += ", ";
        }
        s += "]\n";
        return s;
    }
};

// --- User Model (for Authentication/Authorization) ---
struct User {
    int id = 0;
    std::string username;
    std::string hashed_password; // Store hashed passwords
    std::string role; // e.g., "admin", "viewer", "editor"
    TimePoint created_at;
    TimePoint updated_at;

    std::string to_string() const {
        return "User(ID: " + std::to_string(id) + ", Username: " + username + ", Role: " + role + ")";
    }
};

} // namespace VisGenius

#endif // VISGENIUS_MODELS_H
```