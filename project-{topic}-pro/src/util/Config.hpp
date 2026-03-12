```cpp
#ifndef PAYMENT_PROCESSOR_CONFIG_HPP
#define PAYMENT_PROCESSOR_CONFIG_HPP

#include <string>
#include <nlohmann/json.hpp>

class Config {
public:
    static void load(const std::string& configFilePath);
    static const nlohmann::json& get();

    // Specific getters for common settings
    static std::string getDbHost();
    static int getDbPort();
    static std::string getDbName();
    static std::string getDbUser();
    static std::string getDbPassword();

    static std::string getAppHost();
    static int getAppPort();
    static std::string getLogLevel();
    static std::string getLogFilePath();
    static std::string getJwtSecret();
    static long getJwtExpiryMinutes();


private:
    static nlohmann::json configData;
    static bool isLoaded;
};

#endif // PAYMENT_PROCESSOR_CONFIG_HPP
```