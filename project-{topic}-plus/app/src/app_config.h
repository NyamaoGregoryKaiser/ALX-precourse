#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <string>
#include <cstdlib> // For std::getenv
#include <chrono>  // For std::chrono::seconds

// Helper to get environment variable or default value
std::string get_env_var(const std::string& key, const std::string& default_value) {
    const char* value = std::getenv(key.c_str());
    return value ? std::string(value) : default_value;
}

// Helper to get integer environment variable
int get_env_int(const std::string& key, int default_value) {
    const char* value = std::getenv(key.c_str());
    if (value) {
        try {
            return std::stoi(value);
        } catch (...) {
            return default_value; // Fallback on conversion error
        }
    }
    return default_value;
}

// Helper to get boolean environment variable
bool get_env_bool(const std::string& key, bool default_value) {
    const char* value = std::getenv(key.c_str());
    if (value) {
        std::string s_value = value;
        // Convert to lowercase for case-insensitive comparison
        std::transform(s_value.begin(), s_value.end(), s_value.begin(), ::tolower);
        return (s_value == "true" || s_value == "1" || s_value == "on");
    }
    return default_value;
}

namespace AppConfig {
    const std::string APP_NAME = get_env_var("APP_NAME", "CppDevOpsSystem");
    const std::string APP_ENV = get_env_var("APP_ENV", "development"); // development, production, test
    const int APP_PORT = get_env_int("APP_PORT", 8080);

    // JWT Configuration
    const std::string JWT_SECRET_KEY = get_env_var("JWT_SECRET_KEY", "supersecretkey123!@#");
    const std::chrono::seconds JWT_EXPIRATION_SECONDS = std::chrono::seconds(get_env_int("JWT_EXPIRATION_SECONDS", 3600)); // 1 hour

    // Database Configuration
    const std::string DATABASE_PATH = get_env_var("DATABASE_PATH", "/app/data/app.db");
    const std::string TEST_DATABASE_PATH = get_env_var("TEST_DATABASE_PATH", "/app/data/test_app.db"); // For integration tests

    // Logging Configuration
    const std::string LOG_LEVEL = get_env_var("LOG_LEVEL", "info"); // trace, debug, info, warn, error, critical
    const std::string LOG_FILE_PATH = get_env_var("LOG_FILE_PATH", "/app/logs/app.log");
    const int LOG_MAX_SIZE_MB = get_env_int("LOG_MAX_SIZE_MB", 10); // Max size of log file before rotation
    const int LOG_MAX_FILES = get_env_int("LOG_MAX_FILES", 5); // Max number of rotated log files

    // Caching Configuration
    const std::chrono::seconds CACHE_TTL_SECONDS = std::chrono::seconds(get_env_int("CACHE_TTL_SECONDS", 300)); // 5 minutes

    // Rate Limiting Configuration
    const bool RATE_LIMIT_ENABLED = get_env_bool("RATE_LIMIT_ENABLED", true);
    const int RATE_LIMIT_MAX_REQUESTS = get_env_int("RATE_LIMIT_MAX_REQUESTS", 100);
    const std::chrono::seconds RATE_LIMIT_WINDOW_SECONDS = std::chrono::seconds(get_env_int("RATE_LIMIT_WINDOW_SECONDS", 60)); // 60 seconds (1 minute)

    // Roles
    const std::string ROLE_USER = "USER";
    const std::string ROLE_ADMIN = "ADMIN";
} // namespace AppConfig

#endif // APP_CONFIG_H