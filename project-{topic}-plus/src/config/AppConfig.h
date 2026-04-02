```cpp
#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <string>
#include <map>
#include <fstream>
#include <sstream>
#include <iostream>
#include "../utils/Logger.h"
#include "../utils/StringUtil.h"

namespace TaskManager {
namespace Config {

class AppConfig {
public:
    static AppConfig& getInstance() {
        static AppConfig instance;
        return instance;
    }

    void load(const std::string& filepath = ".env") {
        std::ifstream file(filepath);
        if (!file.is_open()) {
            TaskManager::Utils::Logger::getLogger()->error("Could not open config file: {}", filepath);
            return;
        }

        std::string line;
        while (std::getline(file, line)) {
            line = TaskManager::Utils::StringUtil::trim(line);
            if (line.empty() || line[0] == '#') {
                continue;
            }

            size_t delimiterPos = line.find('=');
            if (delimiterPos != std::string::npos) {
                std::string key = TaskManager::Utils::StringUtil::trim(line.substr(0, delimiterPos));
                std::string value = TaskManager::Utils::StringUtil::trim(line.substr(delimiterPos + 1));
                configMap[key] = value;
            }
        }
        file.close();
        TaskManager::Utils::Logger::getLogger()->info("Configuration loaded from {}.", filepath);
    }

    std::string get(const std::string& key, const std::string& defaultValue = "") const {
        auto it = configMap.find(key);
        if (it != configMap.end()) {
            return it->second;
        }
        TaskManager::Utils::Logger::getLogger()->warn("Config key '{}' not found. Using default value: '{}'", key, defaultValue);
        return defaultValue;
    }

    int getInt(const std::string& key, int defaultValue = 0) const {
        try {
            return std::stoi(get(key, std::to_string(defaultValue)));
        } catch (const std::exception& e) {
            TaskManager::Utils::Logger::getLogger()->error("Failed to convert config key '{}' to int. Error: {}", key, e.what());
            return defaultValue;
        }
    }

    long long getLong(const std::string& key, long long defaultValue = 0) const {
        try {
            return std::stoll(get(key, std::to_string(defaultValue)));
        } catch (const std::exception& e) {
            TaskManager::Utils::Logger::getLogger()->error("Failed to convert config key '{}' to long long. Error: {}", key, e.what());
            return defaultValue;
        }
    }

private:
    AppConfig() = default;
    AppConfig(const AppConfig&) = delete;
    AppConfig& operator=(const AppConfig&) = delete;

    std::map<std::string, std::string> configMap;
};

} // namespace Config
} // namespace TaskManager

#endif // APP_CONFIG_H
```