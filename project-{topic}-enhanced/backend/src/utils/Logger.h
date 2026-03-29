```cpp
#ifndef DATAVIZ_LOGGER_H
#define DATAVIZ_LOGGER_H

#include <spdlog/spdlog.h>
#include <string>

// A simple wrapper around spdlog for centralized logging.
class Logger {
private:
    static std::shared_ptr<spdlog::logger> console_logger;
    static std::string log_level_str;

public:
    // Initialize the logger with a specific level (e.g., "info", "debug", "warn", "error", "critical")
    static void init(const std::string& level = "info");

    // Generic log function (takes spdlog::level::level_enum)
    template<typename... Args>
    static void log(spdlog::level::level_enum level, const char* fmt, const Args&... args) {
        if (console_logger) {
            console_logger->log(level, fmt, args...);
        }
    }

    // Helper functions for common log levels
    template<typename... Args> static void trace(const char* fmt, const Args&... args) { log(spdlog::level::trace, fmt, args...); }
    template<typename... Args> static void debug(const char* fmt, const Args&... args) { log(spdlog::level::debug, fmt, args...); }
    template<typename... Args> static void info(const char* fmt, const Args&... args) { log(spdlog::level::info, fmt, args...); }
    template<typename... Args> static void warn(const char* fmt, const Args&... args) { log(spdlog::level::warn, fmt, args...); }
    template<typename... Args> static void error(const char* fmt, const Args&... args) { log(spdlog::level::err, fmt, args...); }
    template<typename... Args> static void critical(const char* fmt, const Args&... args) { log(spdlog::level::critical, fmt, args...); }
};

#endif // DATAVIZ_LOGGER_H
```