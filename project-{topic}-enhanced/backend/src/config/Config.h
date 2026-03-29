```cpp
#ifndef DATAVIZ_CONFIG_H
#define DATAVIZ_CONFIG_H

#include <string>
#include <stdexcept>
#include <map>

// Represents an application configuration
class Config {
private:
    static std::map<std::string, std::string> settings;
    static bool loaded;

    static std::string getEnvOrDefault(const std::string& key, const std::string& defaultValue);
    static bool getEnvAsBoolOrDefault(const std::string& key, bool defaultValue);

public:
    static bool loadFromEnv();
    static std::string get(const std::string& key);
    static int getInt(const std::string& key);
    static bool getBool(const std::string& key);

    // Specific configuration getters
    static int getAppPort();
    static std::string getLogLevel();
    static std::string getDbHost();
    static int getDbPort();
    static std::string getDbUser();
    static std::string getDbPassword();
    static std::string getDbName();
    static std::string getJwtSecret();
    static std::string getDataStoragePath();

    class ConfigError : public std::runtime_error {
    public:
        explicit ConfigError(const std::string& msg) : std::runtime_error(msg) {}
    };
};

#endif // DATAVIZ_CONFIG_H
```