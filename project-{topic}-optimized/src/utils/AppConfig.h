#pragma once

#include <string>
#include <json/json.h> // From jsoncpp
#include <memory>
#include <mutex>

class AppConfig {
public:
    static AppConfig& getInstance();

    bool load(const std::string& filepath);

    std::string getString(const std::string& key, const std::string& defaultValue = "") const;
    int getInt(const std::string& key, int defaultValue = 0) const;
    bool getBool(const std::string& key, bool defaultValue = false) const;

    // Delete copy constructor and assignment operator for singleton
    AppConfig(const AppConfig&) = delete;
    AppConfig& operator=(const AppConfig&) = delete;

private:
    AppConfig() = default; // Private constructor for singleton
    Json::Value root_;
    std::mutex mutex_;
    bool loaded_ = false;
};