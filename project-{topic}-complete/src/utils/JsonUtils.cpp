```cpp
#include "JsonUtils.h"
#include "utils/Logger.h" // For logging errors
#include <json/writer.h>
#include <json/reader.h>

namespace JsonUtils {

    Json::Value parseJson(const std::string& jsonString) {
        Json::Value root;
        Json::Reader reader;
        if (!reader.parse(jsonString, root)) {
            LOG_ERROR("Failed to parse JSON: {}", reader.getFormattedErrorMessages());
            throw JsonParseException("Invalid JSON format.");
        }
        return root;
    }

    std::string stringifyJson(const Json::Value& value) {
        Json::StreamWriterBuilder builder;
        builder["commentStyle"] = "None";
        builder["indentation"] = ""; // Compact style
        return Json::writeString(builder, value);
    }

    std::string getStringField(const Json::Value& json, const std::string& fieldName, const std::string& defaultValue) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            return defaultValue;
        }
        if (!json[fieldName].isString()) {
            LOG_WARN("Field '{}' is not a string, returning default. Type: {}", fieldName, json[fieldName].type());
            return defaultValue;
        }
        return json[fieldName].asString();
    }

    std::string getStringField(const Json::Value& json, const std::string& fieldName) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            throw JsonFieldException(fieldName, "Missing required string field.");
        }
        if (!json[fieldName].isString()) {
            throw JsonFieldException(fieldName, "Field is not a string.");
        }
        return json[fieldName].asString();
    }

    int getIntField(const Json::Value& json, const std::string& fieldName, int defaultValue) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            return defaultValue;
        }
        if (!json[fieldName].isInt()) {
            LOG_WARN("Field '{}' is not an integer, returning default. Type: {}", fieldName, json[fieldName].type());
            return defaultValue;
        }
        return json[fieldName].asInt();
    }

    int getIntField(const Json::Value& json, const std::string& fieldName) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            throw JsonFieldException(fieldName, "Missing required integer field.");
        }
        if (!json[fieldName].isInt()) {
            throw JsonFieldException(fieldName, "Field is not an integer.");
        }
        return json[fieldName].asInt();
    }

    bool getBoolField(const Json::Value& json, const std::string& fieldName, bool defaultValue) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            return defaultValue;
        }
        if (!json[fieldName].isBool()) {
            LOG_WARN("Field '{}' is not a boolean, returning default. Type: {}", fieldName, json[fieldName].type());
            return defaultValue;
        }
        return json[fieldName].asBool();
    }

    bool getBoolField(const Json::Value& json, const std::string& fieldName) {
        if (!json.isMember(fieldName) || json[fieldName].isNull()) {
            throw JsonFieldException(fieldName, "Missing required boolean field.");
        }
        if (!json[fieldName].isBool()) {
            throw JsonFieldException(fieldName, "Field is not a boolean.");
        }
        return json[fieldName].asBool();
    }

    std::optional<std::string> getOptionalStringField(const Json::Value& json, const std::string& fieldName) {
        if (json.isMember(fieldName) && !json[fieldName].isNull()) {
            if (json[fieldName].isString()) {
                return json[fieldName].asString();
            }
            LOG_WARN("Optional field '{}' exists but is not a string (type: {}).", fieldName, json[fieldName].type());
        }
        return std::nullopt;
    }

    std::optional<int> getOptionalIntField(const Json::Value& json, const std::string& fieldName) {
        if (json.isMember(fieldName) && !json[fieldName].isNull()) {
            if (json[fieldName].isInt()) {
                return json[fieldName].asInt();
            }
            LOG_WARN("Optional field '{}' exists but is not an int (type: {}).", fieldName, json[fieldName].type());
        }
        return std::nullopt;
    }

    std::optional<long> getOptionalLongField(const Json::Value& json, const std::string& fieldName) {
        if (json.isMember(fieldName) && !json[fieldName].isNull()) {
            if (json[fieldName].isNumeric()) { // isInt64 or isLargestInt for long
                return json[fieldName].asInt64();
            }
            LOG_WARN("Optional field '{}' exists but is not a long (type: {}).", fieldName, json[fieldName].type());
        }
        return std::nullopt;
    }

    std::optional<double> getOptionalDoubleField(const Json::Value& json, const std::string& fieldName) {
        if (json.isMember(fieldName) && !json[fieldName].isNull()) {
            if (json[fieldName].isDouble()) {
                return json[fieldName].asDouble();
            }
            LOG_WARN("Optional field '{}' exists but is not a double (type: {}).", fieldName, json[fieldName].type());
        }
        return std::nullopt;
    }

} // namespace JsonUtils
```