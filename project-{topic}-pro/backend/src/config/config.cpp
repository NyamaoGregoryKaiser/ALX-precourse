#include "config.h"
#include <fstream>
#include <sstream>

std::unordered_map<std::string, std::string> Config::env_vars;
bool Config::is_loaded = false;

void Config::load_env(const std::string& filepath) {
    if (is_loaded) {
        return; // Already loaded
    }

    std::ifstream file(filepath);
    if (!file.is_open()) {
        spdlog::warn("Could not open .env file: {}. Using default values or environment variables.", filepath);
        // Attempt to load from actual environment variables if .env not found
        // This simple example just logs a warning. A more robust solution would check `getenv`.
        is_loaded = true; // Mark as loaded to prevent multiple attempts
        return;
    }

    std::string line;
    while (std::getline(file, line)) {
        // Skip comments and empty lines
        if (line.empty() || line[0] == '#') {
            continue;
        }

        size_t eq_pos = line.find('=');
        if (eq_pos != std::string::npos) {
            std::string key = line.substr(0, eq_pos);
            std::string value = line.substr(eq_pos + 1);

            // Trim whitespace
            key.erase(0, key.find_first_not_of(" \t\r\n"));
            key.erase(key.find_last_not_of(" \t\r\n") + 1);
            value.erase(0, value.find_first_not_of(" \t\r\n"));
            value.erase(value.find_last_not_of(" \t\r\n") + 1);

            env_vars[key] = value;
        }
    }
    file.close();
    is_loaded = true;
    spdlog::info(".env file loaded successfully from {}", filepath);
}

std::string Config::get_string(const std::string& key, const std::string& default_value) {
    if (!is_loaded) {
        load_env(); // Ensure env is loaded on first access if not explicitly called
    }

    if (env_vars.count(key)) {
        return env_vars[key];
    }
    // Also check actual system environment variables
    const char* env_val = std::getenv(key.c_str());
    if (env_val) {
        return std::string(env_val);
    }
    spdlog::debug("Config key '{}' not found, using default value.", key);
    return default_value;
}

int Config::get_int(const std::string& key, int default_value) {
    std::string val_str = get_string(key);
    if (!val_str.empty()) {
        try {
            return std::stoi(val_str);
        } catch (const std::exception& e) {
            spdlog::warn("Invalid integer value for config key '{}': {}. Using default.", key, e.what());
        }
    }
    return default_value;
}

bool Config::get_bool(const std::string& key, bool default_value) {
    std::string val_str = get_string(key);
    if (!val_str.empty()) {
        std::transform(val_str.begin(), val_str.end(), val_str.begin(), ::tolower);
        if (val_str == "true" || val_str == "1") return true;
        if (val_str == "false" || val_str == "0") return false;
        spdlog::warn("Invalid boolean value for config key '{}': {}. Using default.", key, val_str);
    }
    return default_value;
}