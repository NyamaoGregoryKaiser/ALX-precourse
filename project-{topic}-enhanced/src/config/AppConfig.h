```cpp
#ifndef APPCONFIG_H
#define APPCONFIG_H

#include <string>
#include <stdexcept>
#include <map>
#include <fstream>
#include <sstream>

#include "../utils/Logger.h"

class AppConfig {
public:
    // Database configuration
    static std::string get_db_host() { return get_env_var("DB_HOST", "localhost"); }
    static int get_db_port() { return std::stoi(get_env_var("DB_PORT", "5432")); }
    static std::string get_db_name() { return get_env_var("DB_NAME", "monitoring_db"); }
    static std::string get_db_user() { return get_env_var("DB_USER", "monitor_user"); }
    static std::string get_db_password() { return get_env_var("DB_PASSWORD", "monitor_password"); }
    static int get_db_pool_size() { return std::stoi(get_env_var("DB_POOL_SIZE", "5")); }

    // Application configuration
    static std::string get_app_host() { return get_env_var("APP_HOST", "0.0.0.0"); }
    static int get_app_port() { return std::stoi(get_env_var("APP_PORT", "8080")); }
    static std::string get_jwt_secret() { return get_env_var("JWT_SECRET", "super_secret_jwt_key_please_change_this_in_production"); }
    static int get_jwt_expiry_seconds() { return std::stoi(get_env_var("JWT_EXPIRY_SECONDS", "3600")); } // 1 hour

    // Caching configuration
    static int get_cache_capacity() { return std::stoi(get_env_var("CACHE_CAPACITY", "100")); }
    static int get_cache_ttl() { return std::stoi(get_env_var("CACHE_TTL_SECONDS", "300")); } // 5 minutes

    // Rate Limiting configuration
    static int get_rate_limit_max_requests() { return std::stoi(get_env_var("RATE_LIMIT_MAX_REQUESTS", "100")); } // 100 requests
    static int get_rate_limit_window_seconds() { return std::stoi(get_env_var("RATE_LIMIT_WINDOW_SECONDS", "60")); } // per 60 seconds

    static void load_config(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            LOG_WARN("Config file '{}' not found. Using environment variables or default values.", filename);
            return;
        }

        std::string line;
        while (std::getline(file, line)) {
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
                // LOG_DEBUG("Loaded config: {}={}", key, value); // Uncomment for debugging
            }
        }
        LOG_INFO("Loaded {} variables from config file '{}'.", env_vars.size(), filename);
    }

private:
    static std::map<std::string, std::string> env_vars;

    static std::string get_env_var(const std::string& key, const std::string& default_value) {
        // First, check our loaded map
        auto it = env_vars.find(key);
        if (it != env_vars.end()) {
            return it->second;
        }

        // Then, check actual environment variables
        const char* env_val = std::getenv(key.c_str());
        if (env_val) {
            return std::string(env_val);
        }

        // If not found, use default
        LOG_WARN("Environment variable '{}' not set. Using default value: '{}'", key, default_value);
        return default_value;
    }

    // Private constructor to prevent instantiation
    AppConfig() = delete;
    AppConfig(const AppConfig&) = delete;
    AppConfig& operator=(const AppConfig&) = delete;
};

// Static member initialization
std::map<std::string, std::string> AppConfig::env_vars;

#endif // APPCONFIG_H

```