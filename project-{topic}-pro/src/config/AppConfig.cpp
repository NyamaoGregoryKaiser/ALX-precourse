```cpp
#include "AppConfig.h"
#include "../utils/Logger.h"
#include <cstdlib> // For std::getenv
#include <stdexcept>
#include <fstream>
#include <sstream>

int AppConfig::server_port = 8080;
std::string AppConfig::db_connection_string = "postgresql://user:password@localhost:5432/aurora_metrics_db";
std::string AppConfig::jwt_secret = "supersecretjwtkey"; // CHANGE IN PRODUCTION!
int AppConfig::jwt_expiry_seconds = 3600; // 1 hour
int AppConfig::cache_ttl_seconds = 300; // 5 minutes
int AppConfig::rate_limit_max_requests = 100;
int AppConfig::rate_limit_window_seconds = 60;
int AppConfig::agent_interval_seconds = 10; // Agent collects data every 10 seconds

std::string AppConfig::getEnv(const std::string& name, const std::string& default_value) {
    const char* value = std::getenv(name.c_str());
    if (value) {
        return value;
    }
    return default_value;
}

int AppConfig::getEnvAsInt(const std::string& name, int default_value) {
    const char* value = std::getenv(name.c_str());
    if (value) {
        try {
            return std::stoi(value);
        } catch (const std::exception& e) {
            Logger::warn("Invalid integer value for environment variable {}: {}. Using default {}.", name, value, default_value);
        }
    }
    return default_value;
}

void AppConfig::loadConfig() {
    // Attempt to load .env file
    std::ifstream file(".env");
    if (file.is_open()) {
        std::string line;
        while (std::getline(file, line)) {
            if (line.empty() || line[0] == '#') continue; // Skip empty lines and comments
            size_t eq_pos = line.find('=');
            if (eq_pos != std::string::npos) {
                std::string key = line.substr(0, eq_pos);
                std::string value = line.substr(eq_pos + 1);
                // Set environment variable from .env file (might be overridden by actual env vars)
                #ifdef _WIN32
                    _putenv_s(key.c_str(), value.c_str());
                #else
                    setenv(key.c_str(), value.c_str(), 0); // 0 means don't overwrite if already set
                #endif
            }
        }
        file.close();
        Logger::info("Loaded .env file.");
    } else {
        Logger::warn("No .env file found. Relying on environment variables or defaults.");
    }

    server_port = getEnvAsInt("SERVER_PORT", server_port);
    db_connection_string = getEnv("DATABASE_URL", db_connection_string);
    jwt_secret = getEnv("JWT_SECRET", jwt_secret);
    jwt_expiry_seconds = getEnvAsInt("JWT_EXPIRY_SECONDS", jwt_expiry_seconds);
    cache_ttl_seconds = getEnvAsInt("CACHE_TTL_SECONDS", cache_ttl_seconds);
    rate_limit_max_requests = getEnvAsInt("RATE_LIMIT_MAX_REQUESTS", rate_limit_max_requests);
    rate_limit_window_seconds = getEnvAsInt("RATE_LIMIT_WINDOW_SECONDS", rate_limit_window_seconds);
    agent_interval_seconds = getEnvAsInt("AGENT_INTERVAL_SECONDS", agent_interval_seconds);

    if (jwt_secret == "supersecretjwtkey") {
        Logger::warn("JWT_SECRET is using default value. PLEASE CHANGE THIS IN PRODUCTION!");
    }
    if (db_connection_string.find("user:password") != std::string::npos) {
        Logger::warn("DATABASE_URL is using default placeholder. PLEASE CONFIGURE YOUR DATABASE CREDENTIALS!");
    }
}

int AppConfig::getServerPort() { return server_port; }
const std::string& AppConfig::getDbConnectionString() { return db_connection_string; }
const std::string& AppConfig::getJwtSecret() { return jwt_secret; }
int AppConfig::getJwtExpirySeconds() { return jwt_expiry_seconds; }
int AppConfig::getCacheTtlSeconds() { return cache_ttl_seconds; }
int AppConfig::getRateLimitMaxRequests() { return rate_limit_max_requests; }
int AppConfig::getRateLimitWindowSeconds() { return rate_limit_window_seconds; }
int AppConfig::getAgentIntervalSeconds() { return agent_interval_seconds; }
```