```cpp
#include "Config.h"
#include "utils/Logger.h"
#include <fstream>
#include <sstream>

namespace Config {
    std::map<std::string, std::string> s_config;
    bool s_is_loaded = false;

    void load(const std::string& filename) {
        s_config.clear();
        std::ifstream file(filename);
        if (!file.is_open()) {
            LOG_WARN("Could not open .env file: {}. Trying to load from environment variables.", filename);
            // Fallback to environment variables if .env file not found
            // This is a simplified fallback. A more robust solution might iterate through expected keys.
            s_config["SERVER_PORT"] = std::getenv("SERVER_PORT") ? std::getenv("SERVER_PORT") : "";
            s_config["SERVER_THREADS"] = std::getenv("SERVER_THREADS") ? std::getenv("SERVER_THREADS") : "";
            s_config["DB_HOST"] = std::getenv("DB_HOST") ? std::getenv("DB_HOST") : "";
            s_config["DB_PORT"] = std::getenv("DB_PORT") ? std::getenv("DB_PORT") : "";
            s_config["DB_USER"] = std::getenv("DB_USER") ? std::getenv("DB_USER") : "";
            s_config["DB_PASSWORD"] = std::getenv("DB_PASSWORD") ? std::getenv("DB_PASSWORD") : "";
            s_config["DB_NAME"] = std::getenv("DB_NAME") ? std::getenv("DB_NAME") : "";
            s_config["JWT_SECRET"] = std::getenv("JWT_SECRET") ? std::getenv("JWT_SECRET") : "";
            s_config["JWT_EXPIRATION_SECONDS"] = std::getenv("JWT_EXPIRATION_SECONDS") ? std::getenv("JWT_EXPIRATION_SECONDS") : "";
            s_config["LOG_LEVEL"] = std::getenv("LOG_LEVEL") ? std::getenv("LOG_LEVEL") : "";
            s_config["RATE_LIMIT_ENABLED"] = std::getenv("RATE_LIMIT_ENABLED") ? std::getenv("RATE_LIMIT_ENABLED") : "";
            s_config["RATE_LIMIT_WINDOW_SECONDS"] = std::getenv("RATE_LIMIT_WINDOW_SECONDS") ? std::getenv("RATE_LIMIT_WINDOW_SECONDS") : "";
            s_config["RATE_LIMIT_MAX_REQUESTS"] = std::getenv("RATE_LIMIT_MAX_REQUESTS") ? std::getenv("RATE_LIMIT_MAX_REQUESTS") : "";
        } else {
            std::string line;
            while (std::getline(file, line)) {
                if (line.empty() || line[0] == '#') {
                    continue;
                }
                size_t eqPos = line.find('=');
                if (eqPos != std::string::npos) {
                    std::string key = line.substr(0, eqPos);
                    std::string value = line.substr(eqPos + 1);
                    // Trim whitespace
                    key.erase(0, key.find_first_not_of(" \t\n\r\f\v"));
                    key.erase(key.find_last_not_of(" \t\n\r\f\v") + 1);
                    value.erase(0, value.find_first_not_of(" \t\n\r\f\v"));
                    value.erase(value.find_last_not_of(" \t\n\r\f\v") + 1);
                    s_config[key] = value;
                }
            }
        }
        s_is_loaded = true;
        LOG_INFO("Configuration loaded from {}. {} entries.", filename, s_config.size());
    }

    void clear() {
        s_config.clear();
        s_is_loaded = false;
    }

    bool isLoaded() {
        return s_is_loaded;
    }

    template <>
    bool get<bool>(const std::string& key, const bool& defaultValue) {
        if (s_config.count(key)) {
            std::string value = s_config[key];
            std::transform(value.begin(), value.end(), value.begin(), ::tolower);
            return value == "true" || value == "1";
        }
        return defaultValue;
    }

    template <>
    bool get<bool>(const std::string& key) {
        if (!s_is_loaded) {
            throw std::runtime_error("Config not loaded. Call Config::load() first.");
        }
        if (s_config.count(key)) {
            std::string value = s_config[key];
            std::transform(value.begin(), value.end(), value.begin(), ::tolower);
            if (value == "true" || value == "1") return true;
            if (value == "false" || value == "0") return false;
            throw std::runtime_error("Failed to convert config value for key '" + key + "' to bool.");
        }
        throw std::runtime_error("Config key '" + key + "' not found.");
    }
}
```