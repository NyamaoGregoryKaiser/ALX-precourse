#include "AppConfig.h"
#include "utils/Logger.h" // For logging configuration errors

AppConfig& AppConfig::get_instance() {
    static AppConfig instance;
    return instance;
}

bool AppConfig::load() {
    try {
        AppConfig& config = get_instance();

        config.port_ = std::stoi(get_env_var("APP_PORT"));
        config.db_connection_string_ = get_env_var("DATABASE_URL");
        config.jwt_secret_ = get_env_var("JWT_SECRET");
        config.redis_host_ = get_env_var("REDIS_HOST");
        config.redis_port_ = std::stoi(get_env_var("REDIS_PORT"));
        config.rate_limit_requests_ = std::stoi(get_env_var("RATE_LIMIT_REQUESTS"));
        config.rate_limit_window_seconds_ = std::stoi(get_env_var("RATE_LIMIT_WINDOW_SECONDS"));
        config.scheduler_interval_seconds_ = std::stoi(get_env_var("SCHEDULER_INTERVAL_SECONDS"));

        LOG_INFO("Configuration loaded: Port={}, DB={}, JWT_Secret=(masked), Redis={}:{}, RateLimit={}/{}s, SchedulerInterval={}s",
                 config.port_, config.db_connection_string_.substr(0, config.db_connection_string_.find('@') + 1) + "...",
                 config.redis_host_, config.redis_port_,
                 config.rate_limit_requests_, config.rate_limit_window_seconds_,
                 config.scheduler_interval_seconds_);

    } catch (const std::exception& e) {
        LOG_CRITICAL("Failed to load application configuration: {}", e.what());
        return false;
    }
    return true;
}