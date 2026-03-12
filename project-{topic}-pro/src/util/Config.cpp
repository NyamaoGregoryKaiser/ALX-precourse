```cpp
#include "util/Config.hpp"
#include "util/Logger.hpp"
#include <fstream>
#include <stdexcept>

nlohmann::json Config::configData;
bool Config::isLoaded = false;

void Config::load(const std::string& configFilePath) {
    if (isLoaded) return;

    std::ifstream file(configFilePath);
    if (!file.is_open()) {
        Logger::get()->critical("Failed to open configuration file: {}", configFilePath);
        throw std::runtime_error("Failed to open configuration file: " + configFilePath);
    }

    try {
        file >> configData;
        isLoaded = true;
        Logger::get()->info("Configuration loaded from {}", configFilePath);
    } catch (const nlohmann::json::parse_error& e) {
        Logger::get()->critical("Error parsing configuration file {}: {}", configFilePath, e.what());
        throw std::runtime_error("Error parsing configuration file: " + std::string(e.what()));
    } catch (const std::exception& e) {
        Logger::get()->critical("An unexpected error occurred while loading config: {}", e.what());
        throw;
    }
}

const nlohmann::json& Config::get() {
    if (!isLoaded) {
        throw std::runtime_error("Config not loaded. Call Config::load() first.");
    }
    return configData;
}

// Implement specific getters
std::string Config::getDbHost() { return get().value("/database/host"_json_pointer, "localhost"); }
int Config::getDbPort() { return get().value("/database/port"_json_pointer, 5432); }
std::string Config::getDbName() { return get().value("/database/dbname"_json_pointer, "paymentdb"); }
std::string Config::getDbUser() { return get().value("/database/user"_json_pointer, "paymentuser"); }
std::string Config::getDbPassword() { return get().value("/database/password"_json_pointer, "securepassword"); }

std::string Config::getAppHost() { return get().value("/application/host"_json_pointer, "0.0.0.0"); }
int Config::getAppPort() { return get().value("/application/port"_json_pointer, 9080); }
std::string Config::getLogLevel() { return get().value("/application/logging/level"_json_pointer, "info"); }
std::string Config::getLogFilePath() { return get().value("/application/logging/filepath"_json_pointer, ""); }
std::string Config::getJwtSecret() { return get().value("/security/jwtSecret"_json_pointer, "super_secret_jwt_key_12345_changeme"); }
long Config::getJwtExpiryMinutes() { return get().value("/security/jwtExpiryMinutes"_json_pointer, 60L); }
```