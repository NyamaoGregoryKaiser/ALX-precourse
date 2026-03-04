#pragma once

#include <string>
#include <cstdlib> // For std::getenv
#include <stdexcept> // For std::runtime_error

enum LogLevel { DEBUG, INFO, WARN, ERROR };

class AppConfig {
public:
    AppConfig() {
        // Load configurations from environment variables
        db_connection_string = getEnvVar("DATABASE_URL", "postgresql://user:password@localhost:5432/datavizdb");
        http_address = getEnvVar("HTTP_ADDRESS", "0.0.0.0");
        http_port = std::stoi(getEnvVar("HTTP_PORT", "8080"));
        jwt_secret = getEnvVar("JWT_SECRET", "super_secret_jwt_key_please_change_this_in_production");
        log_level_str = getEnvVar("LOG_LEVEL", "INFO");
        
        // Parse log level string
        if (log_level_str == "DEBUG") log_level = DEBUG;
        else if (log_level_str == "INFO") log_level = INFO;
        else if (log_level_str == "WARN") log_level = WARN;
        else if (log_level_str == "ERROR") log_level = ERROR;
        else log_level = INFO; // Default to INFO
    }

    const std::string& getDbConnectionString() const { return db_connection_string; }
    const std::string& getHttpAddress() const { return http_address; }
    int getHttpPort() const { return http_port; }
    const std::string& getJwtSecret() const { return jwt_secret; }
    LogLevel getLogLevel() const { return log_level; }

private:
    std::string db_connection_string;
    std::string http_address;
    int http_port;
    std::string jwt_secret;
    std::string log_level_str;
    LogLevel log_level;

    std::string getEnvVar(const std::string& key, const std::string& default_value) {
        const char* value = std::getenv(key.c_str());
        if (value) {
            return std::string(value);
        }
        return default_value;
    }
};