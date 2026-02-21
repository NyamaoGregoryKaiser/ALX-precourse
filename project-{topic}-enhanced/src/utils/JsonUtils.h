```cpp
#ifndef JSONUTILS_H
#define JSONUTILS_H

#include <nlohmann/json.hpp>
#include <string>
#include <stdexcept>
#include <optional>

namespace JsonUtils {

    // Helper to safely get a string value from JSON, with optional default
    std::string get_string(const nlohmann::json& j, const std::string& key, const std::string& default_val = "") {
        if (j.contains(key) && j[key].is_string()) {
            return j[key].get<std::string>();
        }
        if (!default_val.empty()) {
            return default_val;
        }
        throw std::runtime_error("Missing or invalid string field: " + key);
    }

    // Helper to safely get an optional string value from JSON
    std::optional<std::string> get_optional_string(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_string()) {
            return j[key].get<std::string>();
        }
        return std::nullopt;
    }

    // Helper to safely get an int value from JSON
    int get_int(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_number_integer()) {
            return j[key].get<int>();
        }
        throw std::runtime_error("Missing or invalid integer field: " + key);
    }

    // Helper to safely get an optional int value from JSON
    std::optional<int> get_optional_int(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_number_integer()) {
            return j[key].get<int>();
        }
        return std::nullopt;
    }

    // Helper to safely get a double value from JSON
    double get_double(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_number()) {
            return j[key].get<double>();
        }
        throw std::runtime_error("Missing or invalid numeric field: " + key);
    }

    // Helper to safely get an optional double value from JSON
    std::optional<double> get_optional_double(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_number()) {
            return j[key].get<double>();
        }
        return std::nullopt;
    }

    // Helper to safely get a boolean value from JSON
    bool get_bool(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_boolean()) {
            return j[key].get<bool>();
        }
        throw std::runtime_error("Missing or invalid boolean field: " + key);
    }

    // Helper to safely get an optional boolean value from JSON
    std::optional<bool> get_optional_bool(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && j[key].is_boolean()) {
            return j[key].get<bool>();
        }
        return std::nullopt;
    }

    // Generic helper for required fields
    template<typename T>
    T get_required(const nlohmann::json& j, const std::string& key) {
        if (!j.contains(key)) {
            throw std::runtime_error("Missing required field: " + key);
        }
        try {
            return j[key].get<T>();
        } catch (const nlohmann::json::exception& e) {
            throw std::runtime_error("Invalid type for field '" + key + "': " + e.what());
        }
    }

    // Generic helper for optional fields
    template<typename T>
    std::optional<T> get_optional(const nlohmann::json& j, const std::string& key) {
        if (j.contains(key) && !j[key].is_null()) {
            try {
                return j[key].get<T>();
            } catch (const nlohmann::json::exception& e) {
                throw std::runtime_error("Invalid type for optional field '" + key + "': " + e.what());
            }
        }
        return std::nullopt;
    }

} // namespace JsonUtils

#endif // JSONUTILS_H
```