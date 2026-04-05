```cpp
#include "Config.hpp"
#include "../logger/Logger.hpp"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <cstdlib> // For getenv
#include <map>

std::map<std::string, std::string> Config::settings;
bool Config::isLoaded = false;

// Loads configuration from a .env file and environment variables.
void Config::load(const std::string& filename) {
    if (isLoaded) {
        // Logger might not be fully initialized yet, use cerr
        std::cerr << "Warning: Config::load called multiple times." << std::endl;
        return;
    }

    std::ifstream file(filename);
    if (!file.is_open()) {
        // Log to cerr if logger not ready, then use logger
        std::cerr << "Warning: .env file not found at " << filename << ". Relying on environment variables." << std::endl;
        Logger::warn("Config: .env file not found at {}. Relying on environment variables.", filename);
    } else {
        std::string line;
        while (std::getline(file, line)) {
            // Skip comments and empty lines
            if (line.empty() || line[0] == '#') {
                continue;
            }

            size_t eqPos = line.find('=');
            if (eqPos != std::string::npos) {
                std::string key = line.substr(0, eqPos);
                std::string value = line.substr(eqPos + 1);

                // Trim whitespace
                key.erase(0, key.find_first_not_of(" \t\r\n"));
                key.erase(key.find_last_not_of(" \t\r\n") + 1);
                value.erase(0, value.find_first_not_of(" \t\r\n"));
                value.erase(value.find_last_not_of(" \t\r\n") + 1);

                settings[key] = value;
                Logger::debug("Config: Loaded from .env: {}={}", key, value);
            }
        }
        file.close();
    }

    // Override with actual environment variables
    // This allows Docker-compose or system environment vars to take precedence
    // over .env file, which is a common and good practice for production.
    for (const auto& pair : settings) {
        if (const char* env_val = std::getenv(pair.first.c_str())) {
            settings[pair.first] = env_val;
            Logger::debug("Config: Overridden by ENV: {}={}", pair.first, env_val);
        }
    }
    
    // Also check for new environment variables not in .env but set externally
    // (This part is tricky without knowing all possible env vars in advance,
    // so we rely on `.env.example` to define expected keys.)
    // For critical secrets like JWT_SECRET_KEY, we ensure they are explicitly checked
    // if not already loaded from .env.
    if (settings.find("JWT_SECRET_KEY") == settings.end()) {
        if (const char* env_val = std::getenv("JWT_SECRET_KEY")) {
            settings["JWT_SECRET_KEY"] = env_val;
            Logger::debug("Config: Loaded JWT_SECRET_KEY from ENV.");
        }
    }
    if (settings.find("ADMIN_USERNAME") == settings.end()) {
        if (const char* env_val = std::getenv("ADMIN_USERNAME")) {
            settings["ADMIN_USERNAME"] = env_val;
            Logger::debug("Config: Loaded ADMIN_USERNAME from ENV.");
        }
    }
     if (settings.find("ADMIN_PASSWORD") == settings.end()) {
        if (const char* env_val = std::getenv("ADMIN_PASSWORD")) {
            settings["ADMIN_PASSWORD"] = env_val;
            Logger::debug("Config: Loaded ADMIN_PASSWORD from ENV.");
        }
    }

    isLoaded = true;
    Logger::info("Config: Configuration loaded successfully.");
}

// Retrieves a configuration value by key. Throws if key not found.
std::string Config::get(const std::string& key) {
    if (!isLoaded) {
        // Attempt to load from default .env if not loaded explicitly
        // This is for robustness but explicit call to load() is preferred.
        // Logger might not be ready here
        std::cerr << "Warning: Config not loaded, attempting to load from default .env." << std::endl;
        load(".env"); // Or a known default path
    }

    auto it = settings.find(key);
    if (it != settings.end()) {
        return it->second;
    } else {
        // If not found in loaded settings, try reading from environment variable directly one last time
        if (const char* env_val = std::getenv(key.c_str())) {
            settings[key] = env_val; // Cache it for future calls
            Logger::debug("Config: Retrieved {} from ENV directly.", key);
            return env_val;
        }
        Logger::error("Config: Missing required configuration key: {}", key);
        throw std::runtime_error("Missing required configuration key: " + key);
    }
}
```