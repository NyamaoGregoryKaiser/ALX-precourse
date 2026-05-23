#include "JsonUtils.h"
#include "../logger/Logger.h" // For logging errors

namespace JsonUtils {

std::optional<std::string> getString(const nlohmann::json& j, const std::string& key) {
    if (j.contains(key) && j.at(key).is_string()) {
        return j.at(key).get<std::string>();
    }
    return std::nullopt;
}

std::optional<int> getInt(const nlohmann::json& j, const std::string& key) {
    if (j.contains(key) && j.at(key).is_number_integer()) {
        return j.at(key).get<int>();
    }
    return std::nullopt;
}

std::optional<double> getDouble(const nlohmann::json& j, const std::string& key) {
    if (j.contains(key) && j.at(key).is_number()) {
        return j.at(key).get<double>();
    }
    return std::nullopt;
}

bool containsAllKeys(const nlohmann::json& j, const std::vector<std::string>& required_keys) {
    for (const auto& key : required_keys) {
        if (!j.contains(key)) {
            Logger::get_logger()->warn("Missing required JSON key: {}", key);
            return false;
        }
    }
    return true;
}

nlohmann::json parseJson(const std::string& json_str) {
    try {
        return nlohmann::json::parse(json_str);
    } catch (const nlohmann::json::parse_error& e) {
        Logger::get_logger()->error("JSON parse error: {}", e.what());
        throw; // Re-throw to be caught by error handling middleware
    }
}

} // namespace JsonUtils