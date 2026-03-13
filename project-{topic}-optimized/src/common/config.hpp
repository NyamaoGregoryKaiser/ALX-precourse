#ifndef CMS_CONFIG_HPP
#define CMS_CONFIG_HPP

#include <string>
#include <cstdlib> // For getenv
#include <optional>
#include <iostream>

namespace cms::common {

// Utility to get environment variables with default values
inline std::string get_env(const std::string& name, const std::string& default_value = "") {
    const char* value = std::getenv(name.c_str());
    if (value) {
        return value;
    }
    return default_value;
}

inline int get_env_int(const std::string& name, int default_value = 0) {
    const char* value = std::getenv(name.c_str());
    if (value) {
        try {
            return std::stoi(value);
        } catch (const std::exception& e) {
            std::cerr << "Warning: Could not parse integer environment variable '" << name << "': " << e.what() << ". Using default: " << default_value << std::endl;
        }
    }
    return default_value;
}

inline bool get_env_bool(const std::string& name, bool default_value = false) {
    const char* value = std::getenv(name.c_str());
    if (value) {
        std::string s_val = value;
        for (char &c : s_val) {
            c = static_cast<char>(std::tolower(c));
        }
        return (s_val == "true" || s_val == "1" || s_val == "on");
    }
    return default_value;
}


struct AppConfig {
    int app_port;
    std::string jwt_secret;
    std::string log_level;

    // Database
    std::string db_host;
    int db_port;
    std::string db_user;
    std::string db_password;
    std::string db_name;

    // Cache
    size_t cache_max_size;

    // Rate Limiting
    bool rate_limit_enabled;
    int rate_limit_window_seconds;
    int rate_limit_max_requests;

    static const AppConfig& get_instance() {
        static AppConfig instance; // Lazily initialized singleton
        return instance;
    }

private:
    AppConfig() {
        app_port = get_env_int("APP_PORT", 9080);
        jwt_secret = get_env("JWT_SECRET", "default_jwt_secret_please_change_me_in_production");
        log_level = get_env("LOG_LEVEL", "info");

        db_host = get_env("DB_HOST", "localhost");
        db_port = get_env_int("DB_PORT", 5432);
        db_user = get_env("DB_USER", "cms_user");
        db_password = get_env("DB_PASSWORD", "cms_password");
        db_name = get_env("DB_NAME", "cms_db");

        cache_max_size = static_cast<size_t>(get_env_int("CACHE_MAX_SIZE", 100));

        rate_limit_enabled = get_env_bool("RATE_LIMIT_ENABLED", true);
        rate_limit_window_seconds = get_env_int("RATE_LIMIT_WINDOW_SECONDS", 60);
        rate_limit_max_requests = get_env_int("RATE_LIMIT_MAX_REQUESTS", 100);
    }

    // Prevent copying and assignment
    AppConfig(const AppConfig&) = delete;
    AppConfig& operator=(const AppConfig&) = delete;
};

} // namespace cms::common

#endif // CMS_CONFIG_HPP
```