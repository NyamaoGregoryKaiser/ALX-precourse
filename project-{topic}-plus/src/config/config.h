#pragma once

#include <string>
#include <cstdlib> // For std::getenv
#include <stdexcept> // For std::runtime_error

// Function to get environment variables with a default fallback
inline std::string get_env_var(const std::string& name, const std::string& default_value) {
    const char* value = std::getenv(name.c_str());
    return (value != nullptr) ? value : default_value;
}

// Function to get environment variables, throwing an error if not found
inline std::string get_required_env_var(const std::string& name) {
    const char* value = std::getenv(name.c_str());
    if (value == nullptr) {
        throw std::runtime_error("Required environment variable " + name + " not set.");
    }
    return value;
}

namespace Config {
    // Application
    const int APP_PORT = std::stoi(get_env_var("APP_PORT", "9080"));
    const std::string APP_HOST = get_env_var("APP_HOST", "0.0.0.0"); // Listen on all interfaces

    // Database
    const std::string DATABASE_PATH = get_env_var("DATABASE_PATH", "./data/database.db");

    // JWT Configuration
    const std::string JWT_SECRET = get_required_env_var("JWT_SECRET");
    const long JWT_EXPIRATION_SECONDS = std::stol(get_env_var("JWT_EXPIRATION_SECONDS", "3600")); // 1 hour

    // Rate Limiting
    const int RATE_LIMIT_WINDOW_SECONDS = std::stoi(get_env_var("RATE_LIMIT_WINDOW_SECONDS", "60"));
    const int RATE_LIMIT_MAX_REQUESTS = std::stoi(get_env_var("RATE_LIMIT_MAX_REQUESTS", "100"));

    // Default Admin User Seed (for initial database population)
    const std::string DEFAULT_ADMIN_USERNAME = get_env_var("DEFAULT_ADMIN_USERNAME", "admin");
    const std::string DEFAULT_ADMIN_PASSWORD = get_env_var("DEFAULT_ADMIN_PASSWORD", "admin_password"); // Hashed later

    // Logging
    const std::string LOG_FILE_PATH = "./logs/app.log";
    const std::string LOG_LEVEL_STR = get_env_var("LOG_LEVEL", "DEBUG"); // DEBUG, INFO, WARN, ERROR
} // namespace Config

// Utility for setting environment variables for local testing or explicit config.
// In a real deployment, these would typically be set directly in the environment.
// For Docker, use `environment` in `docker-compose.yml`.
inline void set_env_from_file(const std::string& filename = ".env") {
    std::ifstream file(filename);
    if (!file.is_open()) {
        // Not finding .env is okay, might be using system env vars directly
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
            // Remove leading/trailing whitespace
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);

            // Set the environment variable
            // Note: std::putenv is not standard and not thread-safe.
            // For production, ensure env vars are set before application start.
            // This is primarily for local convenience.
            #ifdef _WIN32
                _putenv_s(key.c_str(), value.c_str());
            #else
                setenv(key.c_str(), value.c_str(), 1); // overwrite if exists
            #endif
        }
    }
}
```