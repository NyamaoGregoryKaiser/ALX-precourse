```cpp
#include "ConfigManager.h"

namespace VisuFlow {
namespace Core {
namespace Config {

std::unique_ptr<ConfigManager> ConfigManager::s_instance = nullptr;
bool ConfigManager::s_isLoaded = false;

ConfigManager::ConfigManager() {}

ConfigManager& ConfigManager::getInstance() {
    if (!s_isLoaded || !s_instance) {
        throw std::runtime_error("Configuration not loaded. Call ConfigManager::loadConfig() first.");
    }
    return *s_instance;
}

void ConfigManager::loadConfig(const std::string& filePath) {
    if (s_isLoaded) {
        VisuFlow::Util::Logger::log(spdlog::level::warn, "ConfigManager already loaded. Reloading from: {}", filePath);
    }

    std::ifstream fileStream(filePath);
    if (!fileStream.is_open()) {
        std::string errorMsg = "Failed to open config file: " + filePath;
        VisuFlow::Util::Logger::log(spdlog::level::critical, errorMsg);
        throw std::runtime_error(errorMsg);
    }

    try {
        nlohmann::json jsonConfig;
        fileStream >> jsonConfig;
        s_instance = std::unique_ptr<ConfigManager>(new ConfigManager());
        s_instance->m_configData = jsonConfig;
        s_isLoaded = true;
        VisuFlow::Util::Logger::log(spdlog::level::info, "Configuration loaded successfully from: {}", filePath);
    } catch (const nlohmann::json::parse_error& e) {
        std::string errorMsg = "Failed to parse config JSON: " + std::string(e.what());
        VisuFlow::Util::Logger::log(spdlog::level::critical, errorMsg);
        throw std::runtime_error(errorMsg);
    } catch (const std::exception& e) {
        std::string errorMsg = "An unexpected error occurred while loading config: " + std::string(e.what());
        VisuFlow::Util::Logger::log(spdlog::level::critical, errorMsg);
        throw std::runtime_error(errorMsg);
    }
}

std::string ConfigManager::getString(const std::string& key, const std::string& defaultValue) const {
    return getValue<std::string>(key, defaultValue);
}

int ConfigManager::getInt(const std::string& key, int defaultValue) const {
    return getValue<int>(key, defaultValue);
}

unsigned int ConfigManager::getUint(const std::string& key, unsigned int defaultValue) const {
    return getValue<unsigned int>(key, defaultValue);
}

long long ConfigManager::getLong(const std::string& key, long long defaultValue) const {
    return getValue<long long>(key, defaultValue);
}

bool ConfigManager::getBool(const std::string& key, bool defaultValue) const {
    return getValue<bool>(key, defaultValue);
}

} // namespace Config
} // namespace Core
} // namespace VisuFlow
```