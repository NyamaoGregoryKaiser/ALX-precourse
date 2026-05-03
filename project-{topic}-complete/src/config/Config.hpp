```cpp
#ifndef MLTOOLKIT_CONFIG_HPP
#define MLTOOLKIT_CONFIG_HPP

#include <string>
#include <unordered_map>
#include <stdexcept>
#include <fstream>
#include <sstream>

namespace MLToolkit {
namespace Config {

class Config {
public:
    static Config& get_instance();

    // Load configuration from a file and environment variables
    void load(const std::string& config_file_path);

    // Get a string value from config
    std::string get_string(const std::string& key, const std::string& default_value = "") const;

    // Get an int value from config
    int get_int(const std::string& key, int default_value = 0) const;

    // Get a boolean value from config
    bool get_bool(const std::string& key, bool default_value = false) const;

    // Set a config value (useful for testing or dynamic changes)
    void set(const std::string& key, const std::string& value);

private:
    Config() = default; // Private constructor for Singleton pattern
    Config(const Config&) = delete; // Delete copy constructor
    Config& operator=(const Config&) = delete; // Delete assignment operator

    std::unordered_map<std::string, std::string> settings_;

    void load_from_file(const std::string& file_path);
    void load_from_environment();
    std::string trim(const std::string& str);
};

} // namespace Config
} // namespace MLToolkit

#endif // MLTOOLKIT_CONFIG_HPP
```