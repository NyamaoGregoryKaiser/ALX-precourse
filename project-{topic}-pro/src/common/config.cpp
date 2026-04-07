```cpp
#include "config.h"
#include "logger.h" // For logging configuration issues
#include <fstream>
#include <stdexcept>
#include <sstream>

// For nlohmann/json include (header-only, often placed in common or directly)
#include <nlohmann/json.hpp>

Config& Config::getInstance() {
    static Config instance;
    return instance;
}

Config::Config() {
    // Default values if no config file is loaded or specific keys are missing
    data["server"]["port"] = 9080;
    data["server"]["threads"] = 4;
    data["database"]["host"] = "localhost";
    data["database"]["port"] = 5432;
    data["database"]["user"] = "scraper_user";
    data["database"]["password"] = "scraper_password";
    data["database"]["dbname"] = "scraper_db";
    data["jwt"]["secret"] = "your_super_secret_jwt_key_please_change_this_in_production";
    data["jwt"]["expiry_hours"] = 24;
    data["rate_limit"]["requests_per_minute"] = 60;
    data["rate_limit"]["burst"] = 10;
    data["cache"]["max_items"] = 100;
    data["cache"]["ttl_seconds"] = 300; // 5 minutes
    data["scraper"]["max_retries"] = 3;
    data["scraper"]["retry_delay_ms"] = 1000;
}

void Config::load(const std::string& filePath) {
    std::ifstream file(filePath);
    if (!file.is_open()) {
        Logger::error("Config", "Could not open config file: " + filePath + ". Using default values.");
        return;
    }

    try {
        nlohmann::json loaded_data;
        file >> loaded_data;
        // Merge loaded data into existing data (overwriting defaults)
        for (auto it = loaded_data.begin(); it != loaded_data.end(); ++it) {
            data[it.key()] = it.value();
        }
        Logger::info("Config", "Configuration loaded successfully from: " + filePath);
    } catch (const nlohmann::json::parse_error& e) {
        Logger::error("Config", "Error parsing config file " + filePath + ": " + e.what() + ". Using default values.");
    } catch (const std::exception& e) {
        Logger::error("Config", "An unexpected error occurred while loading config file " + filePath + ": " + e.what() + ". Using default values.");
    }
}

const nlohmann::json* Config::getValue(const std::string& key) const {
    nlohmann::json current = data;
    std::string segment;
    std::istringstream iss(key);

    while (std::getline(iss, segment, '.')) {
        if (current.count(segment)) {
            current = current[segment];
        } else {
            return nullptr; // Key not found
        }
    }
    return &current;
}

std::string Config::getString(const std::string& key, const std::string& defaultValue) const {
    if (const nlohmann::json* value = getValue(key)) {
        if (value->is_string()) {
            return value->get<std::string>();
        }
    }
    Logger::warn("Config", "Config key '" + key + "' not found or not a string. Using default: " + defaultValue);
    return defaultValue;
}

int Config::getInt(const std::string& key, int defaultValue) const {
    if (const nlohmann::json* value = getValue(key)) {
        if (value->is_number_integer()) {
            return value->get<int>();
        }
    }
    Logger::warn("Config", "Config key '" + key + "' not found or not an integer. Using default: " + std::to_string(defaultValue));
    return defaultValue;
}

bool Config::getBool(const std::string& key, bool defaultValue) const {
    if (const nlohmann::json* value = getValue(key)) {
        if (value->is_boolean()) {
            return value->get<bool>();
        }
    }
    Logger::warn("Config", "Config key '" + key + "' not found or not a boolean. Using default: " + (defaultValue ? "true" : "false"));
    return defaultValue;
}

std::vector<std::string> Config::getStringArray(const std::string& key) const {
    std::vector<std::string> result;
    if (const nlohmann::json* value = getValue(key)) {
        if (value->is_array()) {
            for (const auto& item : *value) {
                if (item.is_string()) {
                    result.push_back(item.get<std::string>());
                }
            }
            return result;
        }
    }
    Logger::warn("Config", "Config key '" + key + "' not found or not a string array. Returning empty array.");
    return {};
}
```