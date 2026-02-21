```cpp
#ifndef ALERT_H
#define ALERT_H

#include <string>
#include <nlohmann/json.hpp>
#include <optional>
#include <stdexcept>

// Define an enum for comparison operators for stronger typing
enum class ComparisonOperator {
    GREATER_THAN,       // >
    LESS_THAN,          // <
    GREATER_THAN_EQUAL, // >=
    LESS_THAN_EQUAL,    // <=
    EQUAL,              // =
    NOT_EQUAL           // !=
};

// Helper function to convert ComparisonOperator to string
inline std::string comparison_operator_to_string(ComparisonOperator op) {
    switch (op) {
        case ComparisonOperator::GREATER_THAN:       return ">";
        case ComparisonOperator::LESS_THAN:          return "<";
        case ComparisonOperator::GREATER_THAN_EQUAL: return ">=";
        case ComparisonOperator::LESS_THAN_EQUAL:    return "<=";
        case ComparisonOperator::EQUAL:              return "=";
        case ComparisonOperator::NOT_EQUAL:          return "!=";
        default:                                     return "UNKNOWN";
    }
}

// Helper function to convert string to ComparisonOperator
inline ComparisonOperator string_to_comparison_operator(const std::string& s) {
    if (s == ">")  return ComparisonOperator::GREATER_THAN;
    if (s == "<")  return ComparisonOperator::LESS_THAN;
    if (s == ">=") return ComparisonOperator::GREATER_THAN_EQUAL;
    if (s == "<=") return ComparisonOperator::LESS_THAN_EQUAL;
    if (s == "=")  return ComparisonOperator::EQUAL;
    if (s == "!=") return ComparisonOperator::NOT_EQUAL;
    throw std::invalid_argument("Invalid comparison operator string: " + s);
}

struct Alert {
    std::string id;
    std::string user_id;
    std::string system_id;
    std::string metric_name;
    double threshold_value;
    ComparisonOperator comparison_operator;
    std::string status; // e.g., "active", "inactive"
    std::optional<std::string> alert_message;
    std::string created_at;
    std::string updated_at;

    nlohmann::json to_json() const {
        nlohmann::json j = {
            {"id", id},
            {"user_id", user_id},
            {"system_id", system_id},
            {"metric_name", metric_name},
            {"threshold_value", threshold_value},
            {"comparison_operator", comparison_operator_to_string(comparison_operator)},
            {"status", status},
            {"created_at", created_at},
            {"updated_at", updated_at}
        };
        if (alert_message) {
            j["alert_message"] = *alert_message;
        }
        return j;
    }

    static Alert from_json(const nlohmann::json& j) {
        Alert alert;
        alert.id = j.value("id", "");
        alert.user_id = j.at("user_id").get<std::string>();
        alert.system_id = j.at("system_id").get<std::string>();
        alert.metric_name = j.at("metric_name").get<std::string>();
        alert.threshold_value = j.at("threshold_value").get<double>();
        alert.comparison_operator = string_to_comparison_operator(j.at("comparison_operator").get<std::string>());
        alert.status = j.value("status", "active"); // Default status is active
        alert.alert_message = j.value("alert_message", std::optional<std::string>());
        alert.created_at = j.value("created_at", "");
        alert.updated_at = j.value("updated_at", "");
        return alert;
    }
};

// Alert History entry
struct AlertHistory {
    std::string id;
    std::string alert_id;
    std::string triggered_at;
    double actual_value;
    std::string message;

    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"alert_id", alert_id},
            {"triggered_at", triggered_at},
            {"actual_value", actual_value},
            {"message", message}
        };
    }
};

#endif // ALERT_H
```