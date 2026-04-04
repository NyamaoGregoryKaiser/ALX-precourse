#pragma once

#include <string>
#include <json/json.h> // From jsoncpp
#include <stdexcept>
#include <mutex>

class Config {
public:
    static void load(const std::string& filePath);

    static int getApiPort();
    static std::string getDbPath();
    static std::string getJwtSecret();
    static int getJwtExpiryMinutes();
    static std::string getLogLevel();
    static std::string getLogFile();
    static bool isRateLimitEnabled();
    static int getRateLimitRequests();
    static int getRateLimitWindowSeconds();
    static bool isCacheEnabled();
    static int getCacheSize();
    static int getCacheExpirySeconds();

private:
    static Json::Value root;
    static std::string configFilePath;
    static std::mutex configMutex;

    Config() = delete; // Private constructor to prevent instantiation
    static Json::Value getValue(const std::string& key);
};