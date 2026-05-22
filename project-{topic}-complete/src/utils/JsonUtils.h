```cpp
#pragma once

#include <json/json.h>
#include <string>
#include <optional>
#include <stdexcept>

namespace JsonUtils {
    // Parse a JSON string into a Json::Value object
    Json::Value parseJson(const std::string& jsonString);

    // Stringify a Json::Value object into a compact JSON string
    std::string stringifyJson(const Json::Value& value);

    // Helper to get a string field from a Json::Value, with optional default
    std::string getStringField(const Json::Value& json, const std::string& fieldName, const std::string& defaultValue = "");
    std::string getStringField(const Json::Value& json, const std::string& fieldName);

    // Helper to get an int field from a Json::Value, with optional default
    int getIntField(const Json::Value& json, const std::string& fieldName, int defaultValue = 0);
    int getIntField(const Json::Value& json, const std::string& fieldName);

    // Helper to get a bool field from a Json::Value, with optional default
    bool getBoolField(const Json::Value& json, const std::string& fieldName, bool defaultValue = false);
    bool getBoolField(const Json::Value& json, const std::string& fieldName);

    // Helper to get an optional string field
    std::optional<std::string> getOptionalStringField(const Json::Value& json, const std::string& fieldName);

    // Helper to get an optional int field
    std::optional<int> getOptionalIntField(const Json::Value& json, const std::string& fieldName);
    
    // Helper to get an optional long field
    std::optional<long> getOptionalLongField(const Json::Value& json, const std::string& fieldName);

    // Helper to get an optional double field
    std::optional<double> getOptionalDoubleField(const Json::Value& json, const std::string& fieldName);
}

// Custom exception for JSON parsing errors
class JsonParseException : public std::runtime_error {
public:
    explicit JsonParseException(const std::string& message)
        : std::runtime_error("JSON Parse Error: " + message) {}
};

// Custom exception for missing/invalid JSON fields
class JsonFieldException : public std::runtime_error {
public:
    explicit JsonFieldException(const std::string& fieldName, const std::string& message)
        : std::runtime_error("JSON Field Error: '" + fieldName + "' - " + message) {}
};
```