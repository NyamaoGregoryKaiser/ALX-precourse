```cpp
#include "ConfigManager.hpp"
#include "utils/Logger.hpp"

ConfigManager::ConfigManager() : _pConfig(new Poco::Util::JSONConfiguration()) {
    DB_OPTIMIZER_LOG_DEBUG("ConfigManager initialized.");
}

void ConfigManager::loadConfig(const std::string& filePath) {
    try {
        Poco::FileInputStream fis(filePath);
        _pConfig = new Poco::Util::JSONConfiguration(fis);
        DB_OPTIMIZER_LOG_INFO("Configuration loaded from {}", filePath);
        applyEnvironmentVariables();
    } catch (const Poco::Exception& e) {
        DB_OPTIMIZER_LOG_ERROR("Failed to load configuration from {}: {}. Falling back to default/empty config.", filePath, e.displayText());
        // In a production setup, this might be a critical error. For now, allow fallback.
    } catch (const std::exception& e) {
        DB_OPTIMIZER_LOG_ERROR("Standard exception loading config from {}: {}", filePath, e.what());
    }
}

void ConfigManager::applyEnvironmentVariables() {
    DB_OPTIMIZER_LOG_DEBUG("Applying environment variables to configuration.");

    // Define a mapping from env var name to config key path
    std::map<std::string, std::string> envVarMap = {
        {"DB_OPTIMIZER_SERVER_PORT", "server.port"},
        {"DB_OPTIMIZER_DB_HOST", "database.host"},
        {"DB_OPTIMIZER_DB_PORT", "database.port"},
        {"DB_OPTIMIZER_DB_NAME", "database.name"},
        {"DB_OPTIMIZER_DB_USER", "database.user"},
        {"DB_OPTIMIZER_DB_PASSWORD", "database.password"},
        {"DB_OPTIMIZER_JWT_SECRET", "jwt.secret"},
        {"DB_OPTIMIZER_LOG_LEVEL", "logging.level"},
        {"DB_OPTIMIZER_MONITOR_INTERVAL_SECONDS", "monitor_interval_seconds"}
        // Add more mappings as needed
    };

    for (const auto& pair : envVarMap) {
        if (Poco::Environment::has(pair.first)) {
            std::string envValue = Poco::Environment::get(pair.first);
            try {
                // Try to guess type (int, string, bool). For simplicity, store all as string initially,
                // and `get<T>` will convert. Or explicitly convert if needed.
                // For critical values like port, ensure it's convertible to int.
                if (pair.first.find("PORT") != std::string::npos || pair.first.find("INTERVAL_SECONDS") != std::string::npos) {
                     _pConfig->setInt(pair.second, std::stoi(envValue));
                } else {
                     _pConfig->setString(pair.second, envValue);
                }
                DB_OPTIMIZER_LOG_INFO("Overriding config key '{}' with environment variable '{}'", pair.second, pair.first);
            } catch (const std::exception& e) {
                DB_OPTIMIZER_LOG_WARN("Failed to apply env var {}='{}' to config key '{}': {}", pair.first, envValue, pair.second, e.what());
            }
        }
    }
}
```