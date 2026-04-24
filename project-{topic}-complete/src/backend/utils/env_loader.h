```cpp
#ifndef ECOMMERCE_ENV_LOADER_H
#define ECOMMERCE_ENV_LOADER_H

#include <string>
#include <map>
#include <fstream>
#include <sstream>
#include <algorithm> // for std::remove, std::isspace
#include <spdlog/spdlog.h>

static std::map<std::string, std::string> env_vars;
static std::shared_ptr<spdlog::logger> env_logger;

void load_env(const std::string& filename = "config/.env") {
    env_logger = spdlog::get("ecommerce_logger");
    if (!env_logger) {
        env_logger = spdlog::stdout_color_mt("env_logger");
    }

    std::ifstream file(filename);
    if (!file.is_open()) {
        env_logger->warn("Could not open .env file: {}. Relying on system environment variables.", filename);
        return;
    }

    std::string line;
    while (std::getline(file, line)) {
        // Remove leading/trailing whitespace
        line.erase(0, line.find_first_not_of(" \t\n\r\f\v"));
        line.erase(line.find_last_not_of(" \t\n\r\f\v") + 1);

        // Skip comments and empty lines
        if (line.empty() || line[0] == '#') {
            continue;
        }

        size_t equals_pos = line.find('=');
        if (equals_pos != std::string::npos) {
            std::string key = line.substr(0, equals_pos);
            std::string value = line.substr(equals_pos + 1);

            // Trim whitespace from key and value
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);

            // Remove quotes from value if present
            if (value.length() >= 2 && (
                (value.front() == '\'' && value.back() == '\'') ||
                (value.front() == '"' && value.back() == '"')
            )) {
                value = value.substr(1, value.length() - 2);
            }

            env_vars[key] = value;
            env_logger->debug("Loaded env var: {}={}", key, value.substr(0, 5) + (value.length() > 5 ? "..." : "")); // Censor sensitive parts
        }
    }
    file.close();
    env_logger->info("Environment variables loaded from {}.", filename);
}

std::string get_env(const std::string& key, const std::string& default_value = "") {
    // Check local map first
    if (env_vars.count(key)) {
        return env_vars[key];
    }
    // Then check system environment variables
    const char* env_val = std::getenv(key.c_str());
    if (env_val) {
        return std::string(env_val);
    }
    // Return default value if not found
    if (env_logger) {
        env_logger->warn("Environment variable '{}' not found, using default value.", key);
    }
    return default_value;
}

#endif // ECOMMERCE_ENV_LOADER_H
```