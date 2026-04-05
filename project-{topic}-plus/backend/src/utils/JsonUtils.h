```cpp
#ifndef JSON_UTILS_H
#define JSON_UTILS_H

#include <drogon/drogon.h>
#include <json/json.h>
#include <string>
#include <optional>
#include "AppErrors.h"

namespace TaskManager {
namespace JsonUtils {

/**
 * @brief Safely extract a string value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @param required If true, throws ValidationException if key is missing or not a string.
 * @return The string value.
 * @throws ValidationException if required and key is missing/invalid.
 */
inline std::string getString(const Json::Value& json, const std::string& key, bool required = true) {
    if (!json.isMember(key) || !json[key].isString()) {
        if (required) {
            throw ValidationException("Missing or invalid '" + key + "' field (expected string).");
        }
        return "";
    }
    return json[key].asString();
}

/**
 * @brief Safely extract an optional string value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @return An optional containing the string value, or empty if missing/invalid.
 */
inline std::optional<std::string> getOptionalString(const Json::Value& json, const std::string& key) {
    if (json.isMember(key) && json[key].isString()) {
        return json[key].asString();
    }
    return std::nullopt;
}

/**
 * @brief Safely extract an integer value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @param required If true, throws ValidationException if key is missing or not an int.
 * @return The integer value.
 * @throws ValidationException if required and key is missing/invalid.
 */
inline int getInt(const Json::Value& json, const std::string& key, bool required = true) {
    if (!json.isMember(key) || !json[key].isInt()) {
        if (required) {
            throw ValidationException("Missing or invalid '" + key + "' field (expected integer).");
        }
        return 0; // Default for non-required
    }
    return json[key].asInt();
}

/**
 * @brief Safely extract an optional integer value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @return An optional containing the integer value, or empty if missing/invalid.
 */
inline std::optional<int> getOptionalInt(const Json::Value& json, const std::string& key) {
    if (json.isMember(key) && json[key].isInt()) {
        return json[key].asInt();
    }
    return std::nullopt;
}

/**
 * @brief Safely extract a boolean value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @param required If true, throws ValidationException if key is missing or not a bool.
 * @return The boolean value.
 * @throws ValidationException if required and key is missing/invalid.
 */
inline bool getBool(const Json::Value& json, const std::string& key, bool required = true) {
    if (!json.isMember(key) || !json[key].isBool()) {
        if (required) {
            throw ValidationException("Missing or invalid '" + key + "' field (expected boolean).");
        }
        return false; // Default for non-required
    }
    return json[key].asBool();
}

/**
 * @brief Safely extract an optional boolean value from a JSON object.
 * @param json The JSON object.
 * @param key The key to look for.
 * @return An optional containing the boolean value, or empty if missing/invalid.
 */
inline std::optional<bool> getOptionalBool(const Json::Value& json, const std::string& key) {
    if (json.isMember(key) && json[key].isBool()) {
        return json[key].asBool();
    }
    return std::nullopt;
}


} // namespace JsonUtils
} // namespace TaskManager

#endif // JSON_UTILS_H
```