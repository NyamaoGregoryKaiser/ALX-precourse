#include "config.h"
#include "utils/Logger.h" // For logging configuration load errors
#include <fstream>
#include <iostream>

Json::Value Config::root;
std::string Config::configFilePath;
std::mutex Config::configMutex;

void Config::load(const std::string& filePath) {
    std::lock_guard<std::mutex> lock(configMutex);
    configFilePath = filePath;
    std::ifstream configFile(filePath, std::ifstream::binary);
    if (!configFile.is_open()) {
        throw std::runtime_error("Could not open configuration file: " + filePath);
    }

    Json::CharReaderBuilder builder;
    builder["collectComments"] = false;
    std::string errs;
    if (!Json::parseFromStream(builder, configFile, &root, &errs)) {
        throw std::runtime_error("Failed to parse configuration file " + filePath + ": " + errs);
    }
    LOG_INFO("Configuration loaded from {}", filePath);
}

Json::Value Config::getValue(const std::string& key) {
    std::lock_guard<std::mutex> lock(configMutex);
    if (root.empty()) {
        throw std::runtime_error("Configuration not loaded. Call Config::load() first.");
    }
    Json::Value value = root[key];
    if (value.isNull()) {
        LOG_WARN("Configuration key '{}' not found in {}. Using default/empty value.", key, configFilePath);
    }
    return value;
}

int Config::getApiPort() {
    return getValue("api_port").asInt(8080);
}

std::string Config::getDbPath() {
    return getValue("db_path").asString("./data/app.db");
}

std::string Config::getJwtSecret() {
    std::string secret = getValue("jwt_secret").asString();
    if (secret.empty() || secret == "your_super_secret_jwt_key_that_is_at_least_32_characters_long_and_ideally_64_bytes") {
        LOG_WARN("JWT secret is not set or is default. Please configure a strong secret in config.json.");
        // In a production environment, this should probably throw an error.
        // For development, we might allow a weak default, but warn heavily.
        return "weak_dev_secret"; // Fallback for dev
    }
    return secret;
}

int Config::getJwtExpiryMinutes() {
    return getValue("jwt_expiry_minutes").asInt(1440); // 24 hours
}

std::string Config::getLogLevel() {
    return getValue("log_level").asString("info");
}

std::string Config::getLogFile() {
    return getValue("log_file").asString("./logs/app.log");
}

bool Config::isRateLimitEnabled() {
    return getValue("rate_limit_enabled").asBool(true);
}

int Config::getRateLimitRequests() {
    return getValue("rate_limit_requests").asInt(100);
}

int Config::getRateLimitWindowSeconds() {
    return getValue("rate_limit_window_seconds").asInt(60);
}

bool Config::isCacheEnabled() {
    return getValue("cache_enabled").asBool(true);
}

int Config::getCacheSize() {
    return getValue("cache_size").asInt(1000);
}

int Config::getCacheExpirySeconds() {
    return getValue("cache_expiry_seconds").asInt(300); // 5 minutes
}