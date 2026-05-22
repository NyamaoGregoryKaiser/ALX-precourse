```cpp
#pragma once

#include <string>
#include <map>
#include <stdexcept>
#include <optional>

namespace Config {
    extern std::map<std::string, std::string> s_config;
    extern bool s_is_loaded;

    void load(const std::string& filename = ".env");
    void clear();
    bool isLoaded();

    template <typename T>
    T get(const std::string& key, const T& defaultValue) {
        if (s_config.count(key)) {
            try {
                if constexpr (std::is_same_v<T, std::string>) return s_config[key];
                if constexpr (std::is_same_v<T, int>) return std::stoi(s_config[key]);
                // Add more type conversions as needed (e.g., bool, double)
            } catch (const std::exception& e) {
                // Log error: Type conversion failed, returning default.
                return defaultValue;
            }
        }
        return defaultValue;
    }

    template <typename T>
    T get(const std::string& key) {
        if (!s_is_loaded) {
            throw std::runtime_error("Config not loaded. Call Config::load() first.");
        }
        if (s_config.count(key)) {
            try {
                if constexpr (std::is_same_v<T, std::string>) return s_config[key];
                if constexpr (std::is_same_v<T, int>) return std::stoi(s_config[key]);
                // Add more type conversions as needed
            } catch (const std::exception& e) {
                throw std::runtime_error("Failed to convert config value for key '" + key + "': " + e.what());
            }
        }
        throw std::runtime_error("Config key '" + key + "' not found.");
    }

    template <>
    bool get<bool>(const std::string& key, const bool& defaultValue);
    template <>
    bool get<bool>(const std::string& key);
}
```