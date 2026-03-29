```cpp
#ifndef JSON_CONVERTER_HPP
#define JSON_CONVERTER_HPP

#include "json.hpp" // From nlohmann/json
#include <string>
#include <vector>
#include <stdexcept>

class JSONConverter {
public:
    // Parse a JSON string into a nlohmann::json object
    static nlohmann::json parse(const std::string& json_str);

    // Convert any object (or map/vector) into a nlohmann::json object
    // This is a generic helper. For custom structs, you need to define toJson() methods.
    template<typename T>
    static nlohmann::json toJSON(const T& data) {
        // If T has a toJson() method, use it.
        // This relies on SFINAE or compile-time checks for the presence of toJson().
        // For basic types like string, int, etc., nlohmann::json has direct constructors.
        if constexpr (std::is_convertible_v<decltype(data.toJson()), nlohmann::json>) {
            return data.toJson();
        } else {
            return data; // Assume nlohmann::json can handle it directly (e.g., int, string, bool, std::vector)
        }
    }

    // Overload for std::vector of objects that have toJson()
    template<typename T>
    static nlohmann::json toJSON(const std::vector<T>& data_vec) {
        nlohmann::json j_array = nlohmann::json::array();
        for (const auto& item : data_vec) {
            j_array.push_back(toJSON(item));
        }
        return j_array;
    }

    // Helper to get string from json or throw
    static std::string getString(const nlohmann::json& j, const std::string& key);
    // Helper to get int from json or throw
    static int getInt(const nlohmann::json& j, const std::string& key);
    // Helper to get optional string from json
    static std::optional<std::string> getOptionalString(const nlohmann::json& j, const std::string& key);
    // Helper to get optional int from json
    static std::optional<int> getOptionalInt(const nlohmann::json& j, const std::string& key);

private:
    JSONConverter() = delete; // Prevent instantiation
};

#endif // JSON_CONVERTER_HPP
```