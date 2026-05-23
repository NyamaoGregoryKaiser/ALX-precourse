#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <string>

// Simple struct to hold application configuration
struct AppConfig {
    // Database configuration
    std::string db_host;
    std::string db_port;
    std::string db_name;
    std::string db_user;
    std::string db_password;
    int db_pool_size;

    // Server configuration
    std::string server_host;
    int server_port;

    // JWT configuration
    std::string jwt_secret;
    long jwt_expiry_seconds;

    // Redis configuration (for caching/rate limiting)
    std::string redis_host;
    int redis_port;

    // Logging configuration
    std::string log_level; // e.g., "debug", "info", "warn", "error"

    // Rate Limiting configuration
    int rate_limit_requests_per_minute;

    static const AppConfig& get_instance(); // Singleton accessor

private:
    AppConfig(); // Private constructor for singleton
    AppConfig(const AppConfig&) = delete; // Delete copy constructor
    AppConfig& operator=(const AppConfig&) = delete; // Delete assignment operator

    void load_from_env(); // Load configuration from environment variables
};

#endif // APP_CONFIG_H