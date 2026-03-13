#ifndef CMS_JSON_UTILS_HPP
#define CMS_JSON_UTILS_HPP

#include <nlohmann/json.hpp>
#include <string>
#include <optional>
#include <stdexcept>
#include <chrono>
#include <iomanip>

namespace cms::common {

using json = nlohmann::json;

// Helper function to safely get a string from JSON
inline std::optional<std::string> get_json_string(const json& j, const std::string& key) {
    if (j.contains(key) && j[key].is_string()) {
        return j[key].get<std::string>();
    }
    return std::nullopt;
}

// Helper function to safely get a required string from JSON
inline std::string get_json_string_required(const json& j, const std::string& key) {
    if (j.contains(key) && j[key].is_string()) {
        return j[key].get<std::string>();
    }
    throw std::runtime_error("Missing or invalid required string field: " + key);
}

// Helper function to safely get an optional boolean from JSON
inline std::optional<bool> get_json_bool(const json& j, const std::string& key) {
    if (j.contains(key) && j[key].is_boolean()) {
        return j[key].get<bool>();
    }
    return std::nullopt;
}

// Helper function to safely get an optional int from JSON
inline std::optional<int> get_json_int(const json& j, const std::string& key) {
    if (j.contains(key) && j[key].is_number_integer()) {
        return j[key].get<int>();
    }
    return std::nullopt;
}

// Custom deserialization for std::chrono::time_point
// Expects ISO 8601 format, e.g., "YYYY-MM-DDTHH:MM:SSZ" or "YYYY-MM-DDTHH:MM:SS+HH:MM"
// This is a simplified parser, for full robustness a dedicated date/time library is recommended.
inline std::optional<std::chrono::system_clock::time_point> parse_iso8601(const std::string& datetime_str) {
    std::tm tm = {};
    std::istringstream ss(datetime_str);

    // Try parsing with timezone offset first (e.g., 2023-10-27T10:00:00+01:00)
    ss >> std::get_time(&tm, "%Y-%m-%dT%H:%M:%S%Ez");
    if (!ss.fail() && ss.eof()) {
        // Convert to time_point (UTC assumed for now, `std::get_time` converts to local time usually, this is complex)
        // For simplicity, we treat the parsed time as UTC. A robust solution needs timezone awareness.
        return std::chrono::system_clock::from_time_t(std::mktime(&tm));
    }

    // Clear stream and try parsing with 'Z' (Zulu time, UTC) (e.g., 2023-10-27T10:00:00Z)
    ss.clear();
    ss.str(datetime_str);
    ss >> std::get_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    if (!ss.fail() && ss.eof()) {
        return std::chrono::system_clock::from_time_t(std::mktime(&tm));
    }

    // Fallback: try parsing without timezone (local time assumed)
    ss.clear();
    ss.str(datetime_str);
    ss >> std::get_time(&tm, "%Y-%m-%dT%H:%M:%S");
    if (!ss.fail() && ss.eof()) {
        return std::chrono::system_clock::from_time_t(std::mktime(&tm));
    }
    
    return std::nullopt;
}

// Custom serialization for std::chrono::system_clock::time_point to ISO 8601 UTC string
inline std::string format_iso8601(std::chrono::system_clock::time_point tp) {
    std::time_t tt = std::chrono::system_clock::to_time_t(tp);
    std::tm tm = *std::gmtime(&tt); // Use gmtime for UTC
    std::stringstream ss;
    ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

} // namespace cms::common

#endif // CMS_JSON_UTILS_HPP
```