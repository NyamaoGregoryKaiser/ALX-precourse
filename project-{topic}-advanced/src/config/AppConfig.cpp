```cpp
#include "AppConfig.hpp"
#include <fstream>
#include <iostream>
#include <algorithm> // For std::transform
#include "../utils/Logger.hpp" // For logging configuration issues

std::unordered_map<std::string, std::string> AppConfig::config_map;
std::mutex AppConfig::config_mutex;
bool AppConfig::is_loaded = false;

void AppConfig::loadConfig(const std::string& filepath) {
    std::lock_guard<std::mutex> lock(config_mutex);
    if (is_loaded) {
        Logger::log(LogLevel::WARNING, "Attempted to load config multiple times. Ignoring.");
        return;
    }

    std::ifstream file(filepath);
    if (!file.is_open()) {
        Logger::log(LogLevel::ERROR, "Failed to open .env file: " + filepath);
        // Fallback to default values or throw an exception
        return;
    }

    std::string line;
    while (std::getline(file, line)) {
        parseLine(line);
    }
    file.close();
    is_loaded = true;
    Logger::log(LogLevel::INFO, "Configuration loaded from " + filepath);
}

void AppConfig::parseLine(const std::string& line) {
    // Trim whitespace
    std::string trimmed_line = line;
    trimmed_line.erase(0, trimmed_line.find_first_not_of(" \t\n\r\f\v"));
    trimmed_line.erase(trimmed_line.find_last_not_of(" \t\n\r\f\v") + 1);

    if (trimmed_line.empty() || trimmed_line[0] == '#') {
        return; // Skip empty lines and comments
    }

    size_t eq_pos = trimmed_line.find('=');
    if (eq_pos != std::string::npos) {
        std::string key = trimmed_line.substr(0, eq_pos);
        std::string value = trimmed_line.substr(eq_pos + 1);

        // Trim whitespace from key and value
        key.erase(0, key.find_first_not_of(" \t"));
        key.erase(key.find_last_not_of(" \t") + 1);
        value.erase(0, value.find_first_not_of(" \t"));
        value.erase(value.find_last_not_of(" \t") + 1);

        config_map[key] = value;
    }
}

std::string AppConfig::get(const std::string& key, const std::string& default_value) {
    std::lock_guard<std::mutex> lock(config_mutex);
    auto it = config_map.find(key);
    if (it != config_map.end()) {
        return it->second;
    }
    Logger::log(LogLevel::WARNING, "Config key '" + key + "' not found. Using default value: '" + default_value + "'");
    return default_value;
}

bool AppConfig::getBool(const std::string& key, bool default_value) {
    std::string val_str = get(key, default_value ? "true" : "false");
    std::transform(val_str.begin(), val_str.end(), val_str.begin(), ::tolower);
    if (val_str == "true" || val_str == "1") {
        return true;
    } else if (val_str == "false" || val_str == "0") {
        return false;
    }
    Logger::log(LogLevel::WARNING, "Config key '" + key + "' has non-boolean value '" + val_str + "'. Using default boolean value.");
    return default_value;
}
```