```cpp
#ifndef CONFIG_MANAGER_HPP
#define CONFIG_MANAGER_HPP

#include "Poco/JSON/Object.h"
#include "Poco/JSON/Parser.h"
#include "Poco/FileStream.h"
#include "Poco/Path.h"
#include "Poco/AutoPtr.h"
#include "Poco/Util/IniFileConfiguration.h"
#include "Poco/Util/JSONConfiguration.h"
#include "Poco/Environment.h"
#include <map>
#include <string>
#include <stdexcept>

class ConfigManager {
public:
    ConfigManager();
    ~ConfigManager() = default;

    void loadConfig(const std::string& filePath);

    template <typename T>
    T get(const std::string& key) const {
        return _pConfig->get<T>(key);
    }

    template <typename T>
    T get(const std::string& key, const T& defaultValue) const {
        return _pConfig->get<T>(key, defaultValue);
    }

private:
    Poco::AutoPtr<Poco::Util::AbstractConfiguration> _pConfig;

    // Override config with environment variables
    void applyEnvironmentVariables();
};

#endif // CONFIG_MANAGER_HPP
```