#pragma once

#include <json/json.h>
#include <string>
#include <vector>
#include <optional>

namespace JsonUtil {

// Helper to convert a string to a JSON value, handling potential parsing errors
inline std::optional<Json::Value> parse_json(const std::string& json_string) {
    Json::CharReaderBuilder builder;
    Json::Value root;
    std::string errs;
    std::istringstream s(json_string);
    if (Json::parseFromStream(builder, s, &root, &errs)) {
        return root;
    }
    // LOG_ERROR("Failed to parse JSON: " + errs); // Assuming Logger is available
    return std::nullopt;
}

// Helper to convert a JSON value to a string
inline std::string to_string(const Json::Value& value) {
    Json::StreamWriterBuilder builder;
    builder["indentation"] = "    "; // For pretty printing
    return Json::writeString(builder, value);
}

// Helper to get a string field from JSON, with a default value
inline std::string get_string(const Json::Value& json, const std::string& key, const std::string& default_value = "") {
    if (json.isMember(key) && json[key].isString()) {
        return json[key].asString();
    }
    return default_value;
}

// Helper to get an int field from JSON, with a default value
inline int get_int(const Json::Value& json, const std::string& key, int default_value = 0) {
    if (json.isMember(key) && json[key].isInt()) {
        return json[key].asInt();
    }
    return default_value;
}

// Helper to get a boolean field from JSON, with a default value
inline bool get_bool(const Json::Value& json, const std::string& key, bool default_value = false) {
    if (json.isMember(key) && json[key].isBool()) {
        return json[key].asBool();
    }
    return default_value;
}

// Helper to check if a JSON object contains all required fields
inline bool has_required_fields(const Json::Value& json, const std::vector<std::string>& fields) {
    for (const auto& field : fields) {
        if (!json.isMember(field) || json[field].isNull()) {
            return false;
        }
    }
    return true;
}

} // namespace JsonUtil
```