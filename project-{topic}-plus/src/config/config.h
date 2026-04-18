#pragma once

#include <string>
#include <cstdlib> // For getenv
#include <stdexcept>

// Helper to get environment variables, throwing if not found
std::string get_env_var(const std::string& name) {
    const char* value = std::getenv(name.c_str());
    if (value == nullptr) {
        throw std::runtime_error("Environment variable " + name + " not set.");
    }
    return value;
}

namespace Config {
    struct AppConfig {
        int app_port;
        std::string app_env;
        std::string log_level;
    };

    struct DatabaseConfig {
        std::string db_host;
        int db_port;
        std::string db_name;
        std::string db_user;
        std::string db_password;
    };

    struct JwtConfig {
        std::string jwt_secret;
        long jwt_expiration_seconds;
    };

    AppConfig loadAppConfig() {
        return {
            std::stoi(get_env_var("APP_PORT")),
            get_env_var("APP_ENV"),
            get_env_var("LOG_LEVEL")
        };
    }

    DatabaseConfig loadDatabaseConfig() {
        return {
            get_env_var("DB_HOST"),
            std::stoi(get_env_var("DB_PORT")),
            get_env_var("DB_NAME"),
            get_env_var("DB_USER"),
            get_env_var("DB_PASSWORD")
        };
    }

    JwtConfig loadJwtConfig() {
        return {
            get_env_var("JWT_SECRET"),
            std::stol(get_env_var("JWT_EXPIRATION_SECONDS"))
        };
    }
} // namespace Config
```