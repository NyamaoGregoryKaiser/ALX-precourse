```cpp
#ifndef CONFIG_LOADER_H
#define CONFIG_LOADER_H

#include <string>
#include <map>
#include <stdexcept>
#include <fstream>
#include <sstream> // Required for std::stringstream
#include <cstdlib> // Required for getenv

/**
 * @brief Utility class for loading configuration from environment variables and .env files.
 */
class ConfigLoader {
public:
    /**
     * @brief Loads environment variables from a specified .env file.
     *        If an environment variable is already set, it will not be overwritten by the .env file.
     * @param envFilePath Path to the .env file.
     */
    static void loadEnv(const std::string& envFilePath = ".env") {
        std::ifstream file(envFilePath);
        if (!file.is_open()) {
            // It's okay if .env is not found, we can rely on system environment variables.
            // LOG_WARN << "Warning: .env file not found at " << envFilePath;
            return;
        }

        std::string line;
        while (std::getline(file, line)) {
            // Remove leading/trailing whitespace
            line.erase(0, line.find_first_not_of(" \t\r\n"));
            line.erase(line.find_last_not_of(" \t\r\n") + 1);

            // Skip comments and empty lines
            if (line.empty() || line[0] == '#') {
                continue;
            }

            size_t equalsPos = line.find('=');
            if (equalsPos != std::string::npos) {
                std::string key = line.substr(0, equalsPos);
                std::string value = line.substr(equalsPos + 1);

                key.erase(0, key.find_first_not_of(" \t"));
                key.erase(key.find_last_not_of(" \t") + 1);
                value.erase(0, value.find_first_not_of(" \t"));
                value.erase(value.find_last_not_of(" \t") + 1);

                // Remove quotes from value if present
                if (value.length() >= 2 &&
                    ((value.front() == '\'' && value.back() == '\'') ||
                     (value.front() == '"' && value.back() == '"'))) {
                    value = value.substr(1, value.length() - 2);
                }

                // Only set if not already set in actual environment
                if (getenv(key.c_str()) == nullptr) {
                    setenv(key.c_str(), value.c_str(), 0); // 0 means don't overwrite if already exists
                    // _envVariables[key] = value; // Store internally if needed, but getenv is more direct
                }
            }
        }
    }

    /**
     * @brief Retrieves an environment variable.
     * @param key The name of the environment variable.
     * @param defaultValue A default value to return if the variable is not found.
     * @return The value of the environment variable or the default value.
     */
    static std::string getEnv(const std::string& key, const std::string& defaultValue = "") {
        const char* value = std::getenv(key.c_str());
        if (value) {
            return std::string(value);
        }
        return defaultValue;
    }

    /**
     * @brief Retrieves an environment variable, throwing an error if not found.
     * @param key The name of the environment variable.
     * @return The value of the environment variable.
     * @throws std::runtime_error if the variable is not found.
     */
    static std::string getRequiredEnv(const std::string& key) {
        const char* value = std::getenv(key.c_str());
        if (value) {
            return std::string(value);
        }
        throw std::runtime_error("Required environment variable " + key + " not set.");
    }

private:
    // private constructor to prevent instantiation
    ConfigLoader() = delete;
    // static std::map<std::string, std::string> _envVariables; // Can cache if `getenv` is too slow or if `setenv` is used to load everything
};

#endif // CONFIG_LOADER_H
```