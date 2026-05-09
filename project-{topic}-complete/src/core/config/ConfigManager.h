```cpp
#ifndef VISUFLOW_CONFIG_MANAGER_H
#define VISUFLOW_CONFIG_MANAGER_H

#include "util/Logger.h" // For logging configuration errors
#include <string>
#include <map>
#include <stdexcept>
#include <fstream>
#include <sstream>
#include <nlohmann/json.hpp> // For JSON parsing

namespace VisuFlow {
namespace Core {
namespace Config {

/**
 * @brief Manages application configuration loaded from a JSON file.
 * Implements a Singleton pattern to ensure a single configuration instance.
 */
class ConfigManager {
public:
    // Delete copy constructor and assignment operator for Singleton
    ConfigManager(const ConfigManager&) = delete;
    ConfigManager& operator=(const ConfigManager&) = delete;

    /**
     * @brief Gets the singleton instance of the ConfigManager.
     * @return Reference to the ConfigManager instance.
     * @throws std::runtime_error if config is not loaded yet.
     */
    static ConfigManager& getInstance();

    /**
     * @brief Loads configuration from a specified JSON file.
     * Must be called once before `getInstance()`.
     * @param filePath The path to the configuration JSON file.
     * @throws std::runtime_error if file cannot be opened or parsed.
     */
    static void loadConfig(const std::string& filePath);

    /**
     * @brief Retrieves a string value from the configuration.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found.
     * @return The string value associated with the key, or `defaultValue`.
     */
    std::string getString(const std::string& key, const std::string& defaultValue) const;

    /**
     * @brief Retrieves an integer value from the configuration.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found.
     * @return The integer value associated with the key, or `defaultValue`.
     */
    int getInt(const std::string& key, int defaultValue) const;

    /**
     * @brief Retrieves an unsigned integer value from the configuration.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found.
     * @return The unsigned integer value associated with the key, or `defaultValue`.
     */
    unsigned int getUint(const std::string& key, unsigned int defaultValue) const;

    /**
     * @brief Retrieves a long long value from the configuration.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found.
     * @return The long long value associated with the key, or `defaultValue`.
     */
    long long getLong(const std::string& key, long long defaultValue) const;

    /**
     * @brief Retrieves a boolean value from the configuration.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found.
     * @return The boolean value associated with the key, or `defaultValue`.
     */
    bool getBool(const std::string& key, bool defaultValue) const;

private:
    ConfigManager(); // Private constructor for Singleton

    static std::unique_ptr<ConfigManager> s_instance;
    static bool s_isLoaded;
    nlohmann::json m_configData;

    /**
     * @brief Helper to get a value from JSON, with type checking and default.
     * @tparam T The expected type of the value.
     * @param key The configuration key.
     * @param defaultValue The value to return if the key is not found or type mismatch.
     * @return The value from config or defaultValue.
     */
    template<typename T>
    T getValue(const std::string& key, T defaultValue) const {
        try {
            if (m_configData.contains(key) && m_configData[key].is_primitive()) {
                 return m_configData.at(key).get<T>();
            }
        } catch (const nlohmann::json::exception& e) {
            VisuFlow::Util::Logger::log(spdlog::level::warn,
                                        "Config: Type mismatch or error for key '{}'. Using default. Error: {}", key, e.what());
        }
        return defaultValue;
    }
};

} // namespace Config
} // namespace Core
} // namespace VisuFlow

#endif // VISUFLOW_CONFIG_MANAGER_H
```