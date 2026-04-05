```cpp
#ifndef CONFIG_HPP
#define CONFIG_HPP

#include <string>
#include <map>
#include <iostream> // For std::cerr for early warnings

class Config {
public:
    // Loads configuration from the specified .env file and environment variables.
    // Environment variables take precedence over .env file settings.
    static void load(const std::string& filename = ".env");

    // Retrieves a configuration value by key.
    // Throws std::runtime_error if the key is not found.
    static std::string get(const std::string& key);

private:
    static std::map<std::string, std::string> settings;
    static bool isLoaded; // To prevent multiple loads or warn about it
};

#endif // CONFIG_HPP
```