#ifndef JSON_UTILS_H
#define JSON_UTILS_H

#include <nlohmann/json.hpp>
#include <string>
#include <optional>

namespace JsonUtils {

    // Safely get a string value from JSON
    std::optional<std::string> getString(const nlohmann::json& j, const std::string& key);

    // Safely get an int value from JSON
    std::optional<int> getInt(const nlohmann::json& j, const std::string& key);

    // Safely get a double value from JSON
    std::optional<double> getDouble(const nlohmann::json& j, const std::string& key);

    // Check if a JSON object contains all required keys
    bool containsAllKeys(const nlohmann::json& j, const std::vector<std::string>& required_keys);

    // Convert string to JSON (throws on parse error)
    nlohmann::json parseJson(const std::string& json_str);

} // namespace JsonUtils

#endif // JSON_UTILS_H