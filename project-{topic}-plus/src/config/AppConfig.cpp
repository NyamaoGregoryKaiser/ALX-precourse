#include "AppConfig.h"
#include "../logger/Logger.h"
#include <cstdlib> // For std::getenv
#include <stdexcept> // For std::runtime_error

// Helper to get environment variable, throwing if not found
std::string get_env_var(const std::string& name) {
    const char* value = std::getenv(name.c_str());
    if (value == nullptr) {
        throw std::runtime_error("Environment variable " + name + " not set.");
    }
    return value;
}

// Helper to get environment variable with a default value
std::string get_env_var(const std::string& name, const std::string& default_value) {
    const char* value = std::getenv(name.c_str());
    return (value == nullptr) ? default_value : value;
}

// Helper to convert string to int
int string_to_int(const std::string& s, const std::string& var_name) {
    try {
        return std::stoi(s);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to convert " + var_name + " to integer: " + s + " (" + e.what() + ")");
    }
}

// Singleton instance
const AppConfig& AppConfig::get_instance() {
    static AppConfig instance; // Guaranteed to be destroyed, instantiated on first use.
    return instance;
}

AppConfig::AppConfig() {
    load_from_env();
    Logger::get_logger()->info("AppConfig loaded successfully.");
}

void AppConfig::load_from_env() {
    try {
        // Database
        db_host = get_env_var("DB_HOST", "localhost");
        db_port = get_env_var("DB_PORT", "5432");
        db_name = get_env_var("DB_NAME", "ecommerce_db");
        db_user = get_env_var("DB_USER", "user");
        db_password = get_env_var("DB_PASSWORD", "password");
        db_pool_size = string_to_int(get_env_var("DB_POOL_SIZE", "10"), "DB_POOL_SIZE");

        // Server
        server_host = get_env_var("SERVER_HOST", "0.0.0.0");
        server_port = string_to_int(get_env_var("SERVER_PORT", "8080"), "SERVER_PORT");

        // JWT
        jwt_secret = get_env_var("JWT_SECRET"); // Must be set
        jwt_expiry_seconds = string_to_int(get_env_var("JWT_EXPIRY_SECONDS", "3600"), "JWT_EXPIRY_SECONDS");

        // Redis
        redis_host = get_env_var("REDIS_HOST", "localhost");
        redis_port = string_to_int(get_env_var("REDIS_PORT", "6379"), "REDIS_PORT");

        // Logging
        log_level = get_env_var("LOG_LEVEL", "info");

        // Rate Limiting
        rate_limit_requests_per_minute = string_to_int(get_env_var("RATE_LIMIT_RPM", "60"), "RATE_LIMIT_RPM");

    } catch (const std::runtime_error& e) {
        Logger::get_logger()->error("Configuration error: {}", e.what());
        // In a real application, you might want to exit here or handle more gracefully.
        throw;
    }
}