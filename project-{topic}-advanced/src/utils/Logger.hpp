```cpp
#ifndef LOGGER_HPP
#define LOGGER_HPP

#include <string>
#include <mutex>
#include <fstream>
#include "../config/AppConfig.hpp" // For LogLevel enum

class Logger {
public:
    static void init(LogLevel level = LogLevel::INFO, const std::string& filename = "app.log");
    static void log(LogLevel level, const std::string& message);
    static void close();

private:
    static LogLevel current_log_level;
    static std::ofstream log_file;
    static std::mutex log_mutex;
    static bool is_initialized;

    static std::string logLevelToString(LogLevel level);
    static std::string getCurrentTimestamp();

    // Private constructor to prevent instantiation
    Logger() = delete;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
};

#endif // LOGGER_HPP
```