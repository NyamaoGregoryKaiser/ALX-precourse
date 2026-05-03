```cpp
#include "Config.hpp"
#include "../common/Logger.hpp"
#include "../common/Exceptions.hpp"
#include <cstdlib> // For getenv

namespace MLToolkit {
namespace Config {

Config& Config::get_instance() {
    static Config instance;
    return instance;
}

void Config::load(const std::string& config_file_path) {
    LOG_INFO("Loading configuration from: {}", config_file_path);
    load_from_file(config_file_path);
    load_from_environment();
    LOG_INFO("Configuration loaded successfully.");
}

std::string Config::get_string(const std::string& key, const std::string& default_value) const {
    auto it = settings_.find(key);
    if (it != settings_.end()) {
        return it->second;
    }
    LOG_DEBUG("Config key '{}' not found, returning default string value.", key);
    return default_value;
}

int Config::get_int(const std::string& key, int default_value) const {
    auto it = settings_.find(key);
    if (it != settings_.end()) {
        try {
            return std::stoi(it->second);
        } catch (const std::exception& e) {
            LOG_WARN("Failed to convert config key '{}' value '{}' to int: {}. Returning default.",
                     key, it->second, e.what());
        }
    }
    LOG_DEBUG("Config key '{}' not found or invalid int, returning default int value.", key);
    return default_value;
}

bool Config::get_bool(const std::string& key, bool default_value) const {
    auto it = settings_.find(key);
    if (it != settings_.end()) {
        std::string value = trim(it->second);
        std::transform(value.begin(), value.end(), value.begin(), ::tolower);
        if (value == "true" || value == "1" || value == "yes") {
            return true;
        }
        if (value == "false" || value == "0" || value == "no") {
            return false;
        }
        LOG_WARN("Failed to convert config key '{}' value '{}' to bool. Returning default.", key, it->second);
    }
    LOG_DEBUG("Config key '{}' not found or invalid bool, returning default bool value.", key);
    return default_value;
}

void Config::set(const std::string& key, const std::string& value) {
    settings_[key] = value;
    LOG_DEBUG("Config key '{}' set to '{}'.", key, value);
}

void Config::load_from_file(const std::string& file_path) {
    std::ifstream file(file_path);
    if (!file.is_open()) {
        LOG_WARN("Config file '{}' not found, proceeding without it.", file_path);
        return;
    }

    std::string line;
    while (std::getline(file, line)) {
        line = trim(line);
        if (line.empty() || line[0] == '#') { // Skip empty lines and comments
            continue;
        }

        size_t delimiter_pos = line.find('=');
        if (delimiter_pos == std::string::npos) {
            LOG_WARN("Malformed config line: '{}'. Skipping.", line);
            continue;
        }

        std::string key = trim(line.substr(0, delimiter_pos));
        std::string value = trim(line.substr(delimiter_pos + 1));
        settings_[key] = value;
        LOG_DEBUG("Loaded config from file: {}={}", key, value);
    }
    file.close();
}

void Config::load_from_environment() {
    // Example: Look for ML_DB_HOST, ML_DB_PORT, ML_API_PORT, etc.
    // Environment variables override file settings.
    const char* env_db_host = std::getenv("ML_DB_HOST");
    if (env_db_host) {
        settings_["DB_HOST"] = env_db_host;
        LOG_DEBUG("Overriding DB_HOST from environment: {}", env_db_host);
    }
    const char* env_db_port = std::getenv("ML_DB_PORT");
    if (env_db_port) {
        settings_["DB_PORT"] = env_db_port;
        LOG_DEBUG("Overriding DB_PORT from environment: {}", env_db_port);
    }
    const char* env_db_name = std::getenv("ML_DB_NAME");
    if (env_db_name) {
        settings_["DB_NAME"] = env_db_name;
        LOG_DEBUG("Overriding DB_NAME from environment: {}", env_db_name);
    }
    const char* env_db_user = std::getenv("ML_DB_USER");
    if (env_db_user) {
        settings_["DB_USER"] = env_db_user;
        LOG_DEBUG("Overriding DB_USER from environment: {}", env_db_user);
    }
    const char* env_db_password = std::getenv("ML_DB_PASSWORD");
    if (env_db_password) {
        settings_["DB_PASSWORD"] = env_db_password;
        LOG_DEBUG("Overriding DB_PASSWORD from environment.");
    }

    const char* env_api_port = std::getenv("ML_API_PORT");
    if (env_api_port) {
        settings_["API_PORT"] = env_api_port;
        LOG_DEBUG("Overriding API_PORT from environment: {}", env_api_port);
    }

    const char* env_jwt_secret = std::getenv("ML_JWT_SECRET");
    if (env_jwt_secret) {
        settings_["JWT_SECRET"] = env_jwt_secret;
        LOG_DEBUG("Overriding JWT_SECRET from environment.");
    }
    
    const char* env_log_level = std::getenv("ML_LOG_LEVEL");
    if (env_log_level) {
        settings_["LOG_LEVEL"] = env_log_level;
        LOG_DEBUG("Overriding LOG_LEVEL from environment: {}", env_log_level);
    }
}

std::string Config::trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (std::string::npos == first) {
        return str;
    }
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

} // namespace Config
} // namespace MLToolkit
```