#include "AppConfig.h"
#include <fstream>
#include <iostream>
#include <spdlog/spdlog.h>

AppConfig& AppConfig::getInstance() {
    static AppConfig instance;
    return instance;
}

bool AppConfig::load(const std::string& filepath) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (loaded_) {
        spdlog::warn("AppConfig already loaded. Ignoring attempt to reload from {}.", filepath);
        return true;
    }

    std::ifstream file(filepath);
    if (!file.is_open()) {
        spdlog::error("Failed to open configuration file: {}", filepath);
        return false;
    }

    Json::CharReaderBuilder builder;
    builder["commentStyle"] = "Cpp";
    builder["strictRoot"] = true;
    JSONCPP_STRING errs;

    if (!Json::parseFromStream(builder, file, &root_, &errs)) {
        spdlog::error("Failed to parse configuration file {}: {}", filepath, errs);
        file.close();
        return false;
    }

    file.close();
    loaded_ = true;
    spdlog::info("Configuration loaded successfully from {}.", filepath);
    return true;
}

std::string AppConfig::getString(const std::string& key, const std::string& defaultValue) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (root_.isMember(key) && root_[key].isString()) {
        return root_[key].asString();
    }
    spdlog::warn("Config key '{}' not found or not a string. Using default value.", key);
    return defaultValue;
}

int AppConfig::getInt(const std::string& key, int defaultValue) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (root_.isMember(key) && root_[key].isInt()) {
        return root_[key].asInt();
    }
    spdlog::warn("Config key '{}' not found or not an integer. Using default value.", key);
    return defaultValue;
}

bool AppConfig::getBool(const std::string& key, bool defaultValue) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (root_.isMember(key) && root_[key].isBool()) {
        return root_[key].asBool();
    }
    spdlog::warn("Config key '{}' not found or not a boolean. Using default value.", key);
    return defaultValue;
}