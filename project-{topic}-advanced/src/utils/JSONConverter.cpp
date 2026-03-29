```cpp
#include "JSONConverter.hpp"
#include "Logger.hpp"
#include "../exceptions/CustomExceptions.hpp" // For BadRequestException

nlohmann::json JSONConverter::parse(const std::string& json_str) {
    try {
        return nlohmann::json::parse(json_str);
    } catch (const nlohmann::json::parse_error& e) {
        Logger::log(LogLevel::ERROR, "JSON parse error: " + std::string(e.what()));
        throw BadRequestException("Invalid JSON format.");
    }
}

std::string JSONConverter::getString(const nlohmann::json& j, const std::string& key) {
    if (!j.contains(key) || !j.at(key).is_string()) {
        throw BadRequestException("Missing or invalid string field: " + key);
    }
    return j.at(key).get<std::string>();
}

int JSONConverter::getInt(const nlohmann::json& j, const std::string& key) {
    if (!j.contains(key) || !j.at(key).is_number_integer()) {
        throw BadRequestException("Missing or invalid integer field: " + key);
    }
    return j.at(key).get<int>();
}

std::optional<std::string> JSONConverter::getOptionalString(const nlohmann::json& j, const std::string& key) {
    if (j.contains(key) && j.at(key).is_string()) {
        return j.at(key).get<std::string>();
    }
    return std::nullopt;
}

std::optional<int> JSONConverter::getOptionalInt(const nlohmann::json& j, const std::string& key) {
    if (j.contains(key) && j.at(key).is_number_integer()) {
        return j.at(key).get<int>();
    }
    return std::nullopt;
}
```