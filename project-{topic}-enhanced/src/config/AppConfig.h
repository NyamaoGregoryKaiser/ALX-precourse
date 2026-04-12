#pragma once

#include <string>
#include <stdexcept>
#include <cstdlib> // For std::getenv

class AppConfig {
public:
    static AppConfig& get_instance();
    static bool load(); // Loads config from environment variables

    // Getters for configuration values
    int get_port() const { return port_; }
    const std::string& get_db_connection_string() const { return db_connection_string_; }
    const std::string& get_jwt_secret() const { return jwt_secret_; }
    const std::string& get_redis_host() const { return redis_host_; }
    int get_redis_port() const { return redis_port_; }
    int get_rate_limit_requests() const { return rate_limit_requests_; }
    int get_rate_limit_window_seconds() const { return rate_limit_window_seconds_; }
    int get_scheduler_interval_seconds() const { return scheduler_interval_seconds_; }

private:
    AppConfig() = default; // Private constructor for singleton
    AppConfig(const AppConfig&) = delete;
    AppConfig& operator=(const AppConfig&) = delete;

    // Helper to get environment variable or throw
    static std::string get_env_var(const std::string& name) {
        const char* value = std::getenv(name.c_str());
        if (!value || std::string(value).empty()) {
            throw std::runtime_error("Environment variable " + name + " not set.");
        }
        return value;
    }

    int port_;
    std::string db_connection_string_;
    std::string jwt_secret_;
    std::string redis_host_;
    int redis_port_;
    int rate_limit_requests_;
    int rate_limit_window_seconds_;
    int scheduler_interval_seconds_;
};