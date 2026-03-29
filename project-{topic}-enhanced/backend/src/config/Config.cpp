```cpp
#include "Config.h"
#include "../utils/Logger.h" // For logging configuration issues
#include <cstdlib> // For getenv
#include <iostream>

std::map<std::string, std::string> Config::settings;
bool Config::loaded = false;

std::string Config::getEnvOrDefault(const std::string& key, const std::string& defaultValue) {
    const char* env_var = std::getenv(key.c_str());
    if (env_var) {
        return std::string(env_var);
    }
    return defaultValue;
}

bool Config::getEnvAsBoolOrDefault(const std::string& key, bool defaultValue) {
    const char* env_var = std::getenv(key.c_str());
    if (env_var) {
        std::string val(env_var);
        std::transform(val.begin(), val.end(), val.begin(), ::tolower);
        return (val == "true" || val == "1" || val == "yes");
    }
    return defaultValue;
}

bool Config::loadFromEnv() {
    if (loaded) return true; // Already loaded

    Logger::debug("Loading configuration from environment variables.");

    settings["APP_PORT"] = getEnvOrDefault("DATA_VIZ_APP_PORT", "18080");
    settings["LOG_LEVEL"] = getEnvOrDefault("DATA_VIZ_LOG_LEVEL", "info");
    settings["DB_HOST"] = getEnvOrDefault("DATA_VIZ_DB_HOST", "localhost");
    settings["DB_PORT"] = getEnvOrDefault("DATA_VIZ_DB_PORT", "5432");
    settings["DB_USER"] = getEnvOrDefault("DATA_VIZ_DB_USER", "dataviz_user");
    settings["DB_PASSWORD"] = getEnvOrDefault("DATA_VIZ_DB_PASSWORD", "dataviz_password");
    settings["DB_NAME"] = getEnvOrDefault("DATA_VIZ_DB_NAME", "dataviz_db");
    settings["JWT_SECRET"] = getEnvOrDefault("DATA_VIZ_JWT_SECRET", "super_secret_jwt_key_default");
    settings["DATA_STORAGE_PATH"] = getEnvOrDefault("DATA_VIZ_STORAGE_PATH", "./assets/datasets");

    // Basic validation for critical settings
    if (settings["JWT_SECRET"] == "super_secret_jwt_key_default") {
        Logger::warn("Using default JWT_SECRET. Please set DATA_VIZ_JWT_SECRET environment variable for production.");
    }

    // Ensure data storage path exists or can be created (optional, but good practice)
    // This is typically handled at application startup or deployment
    // For now, just log it.
    Logger::debug("Data storage path set to: {}", settings["DATA_STORAGE_PATH"]);

    loaded = true;
    return true;
}

std::string Config::get(const std::string& key) {
    if (!loaded) {
        throw ConfigError("Config not loaded. Call loadFromEnv() first.");
    }
    auto it = settings.find(key);
    if (it != settings.end()) {
        return it->second;
    }
    throw ConfigError("Configuration key not found: " + key);
}

int Config::getInt(const std::string& key) {
    try {
        return std::stoi(get(key));
    } catch (const std::invalid_argument& e) {
        throw ConfigError("Invalid integer value for config key: " + key + " - " + e.what());
    } catch (const std::out_of_range& e) {
        throw ConfigError("Integer value out of range for config key: " + key + " - " + e.what());
    }
}

bool Config::getBool(const std::string& key) {
    std::string val = get(key);
    std::transform(val.begin(), val.end(), val.begin(), ::tolower);
    return (val == "true" || val == "1" || val == "yes");
}

int Config::getAppPort() { return getInt("APP_PORT"); }
std::string Config::getLogLevel() { return get("LOG_LEVEL"); }
std::string Config::getDbHost() { return get("DB_HOST"); }
int Config::getDbPort() { return getInt("DB_PORT"); }
std::string Config::getDbUser() { return get("DB_USER"); }
std::string Config::getDbPassword() { return get("DB_PASSWORD"); }
std::string Config::getDbName() { return get("DB_NAME"); }
std::string Config::getJwtSecret() { return get("JWT_SECRET"); }
std::string Config::getDataStoragePath() { return get("DATA_STORAGE_PATH"); }
```