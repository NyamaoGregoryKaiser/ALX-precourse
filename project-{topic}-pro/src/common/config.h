```cpp
#ifndef WEBSCRAPER_CONFIG_H
#define WEBSCRAPER_CONFIG_H

#include <string>
#include <map>
#include <vector>
#include <nlohmann/json.hpp> // Using nlohmann/json for config parsing

class Config {
public:
    static Config& getInstance();

    // Prevent copying
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;

    std::string getString(const std::string& key, const std::string& defaultValue = "") const;
    int getInt(const std::string& key, int defaultValue = 0) const;
    bool getBool(const std::string& key, bool defaultValue = false) const;
    std::vector<std::string> getStringArray(const std::string& key) const;

    void load(const std::string& filePath);

private:
    Config(); // Private constructor for singleton
    nlohmann::json data;

    // Helper to get nested value
    const nlohmann::json* getValue(const std::string& key) const;
};

#endif // WEBSCRAPER_CONFIG_H
```