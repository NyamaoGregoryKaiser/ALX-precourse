```cpp
#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <string>
#include <map>
#include <fstream>
#include <nlohmann/json.hpp>
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Config {

class AppConfig {
public:
    static AppConfig& getInstance() {
        static AppConfig instance;
        return instance;
    }

    void load(const std::string& configFile) {
        std::ifstream ifs(configFile);
        if (!ifs.is_open()) {
            LOG_CRITICAL("Failed to open config file: {}", configFile);
            throw std::runtime_error("Failed to open config file: " + configFile);
        }

        try {
            nlohmann::json j;
            ifs >> j;

            // Database
            dbPath = j.value("database_path", "payment_processor.db");

            // Server
            serverPort = j.value("server_port", 8080);
            serverHost = j.value("server_host", "0.0.0.0");

            // JWT
            jwtSecret = j.value("jwt_secret", "supersecretjwtkey_please_change_in_production");
            jwtExpiryHours = j.value("jwt_expiry_hours", 24);

            // Other settings
            defaultCurrency = j.value("default_currency", "USD");

            LOG_INFO("Configuration loaded successfully from {}", configFile);
            LOG_DEBUG("DB Path: {}", dbPath);
            LOG_DEBUG("Server Port: {}", serverPort);
            LOG_DEBUG("JWT Secret (first 5 chars): {}", jwtSecret.substr(0, std::min((size_t)5, jwtSecret.length())));

        } catch (const nlohmann::json::exception& e) {
            LOG_CRITICAL("Error parsing config file {}: {}", configFile, e.what());
            throw std::runtime_error("Error parsing config file: " + std::string(e.what()));
        }
    }

    // Getters for configuration values
    const std::string& getDbPath() const { return dbPath; }
    int getServerPort() const { return serverPort; }
    const std::string& getServerHost() const { return serverHost; }
    const std::string& getJwtSecret() const { return jwtSecret; }
    int getJwtExpiryHours() const { return jwtExpiryHours; }
    const std::string& getDefaultCurrency() const { return defaultCurrency; }

private:
    AppConfig() = default; // Private constructor for singleton
    AppConfig(const AppConfig&) = delete; // Delete copy constructor
    AppConfig& operator=(const AppConfig&) = delete; // Delete assignment operator

    // Configuration members
    std::string dbPath;
    int serverPort;
    std::string serverHost;
    std::string jwtSecret;
    int jwtExpiryHours;
    std::string defaultCurrency;
};

} // namespace Config
} // namespace PaymentProcessor

#endif // APP_CONFIG_H
```