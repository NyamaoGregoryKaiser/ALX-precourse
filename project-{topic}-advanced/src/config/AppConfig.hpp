```cpp
#ifndef APP_CONFIG_HPP
#define APP_CONFIG_HPP

#include <string>
#include <unordered_map>
#include <vector>
#include <mutex>

enum class LogLevel {
    DEBUG = 0,
    INFO,
    WARNING,
    ERROR,
    CRITICAL
};

class AppConfig {
public:
    static void loadConfig(const std::string& filepath);
    static std::string get(const std::string& key, const std::string& default_value = "");
    static bool getBool(const std::string& key, bool default_value = false);

private:
    static std::unordered_map<std::string, std::string> config_map;
    static std::mutex config_mutex;
    static bool is_loaded;

    static void parseLine(const std::string& line);
};

#endif // APP_CONFIG_HPP
```