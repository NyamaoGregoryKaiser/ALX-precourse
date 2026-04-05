```cpp
#ifndef LOGGER_HPP
#define LOGGER_HPP

#include <spdlog/spdlog.h>
#include <string>
#include <memory>

// Logger wrapper class using spdlog.
// Provides static methods for logging at various levels.
class Logger {
public:
    // Initializes the logger. Can be called multiple times, subsequent calls will update level.
    // @param logFile Path to the log file.
    // @param level Minimum log level (e.g., spdlog::level::info).
    // @param productionMode If true, enables production-friendly logging (e.g., more compact, potentially JSON-like).
    static void setup(const std::string& logFile, spdlog::level::level_enum level, bool productionMode = false);

    // Helper to convert string to spdlog level enum.
    static spdlog::level::level_enum stringToLevel(const std::string& levelStr);

    // Generic logging function (use macros for convenience)
    template<typename... Args>
    static void log(spdlog::level::level_enum level, const char* fmt, const Args&... args) {
        if (appLogger) {
            appLogger->log(level, fmt, args...);
        } else {
            // Fallback to stderr if logger not initialized (should ideally not happen after setup)
            std::cerr << "LOGGER NOT INITIALIZED: " << fmt << std::endl;
        }
    }

    // Convenience macros for different log levels
#define LOG_MACRO(level, fmt, ...) Logger::log(level, fmt, ##__VA_ARGS__)

    // Trace-level logging. Very detailed, usually for debugging internal logic.
    template<typename... Args> static void trace(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::trace, fmt, ##args); }
    // Debug-level logging. Detailed information for debugging.
    template<typename... Args> static void debug(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::debug, fmt, ##args); }
    // Info-level logging. General application progress and interesting events.
    template<typename... Args> static void info(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::info, fmt, ##args); }
    // Warn-level logging. Potentially harmful situations.
    template<typename... Args> static void warn(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::warn, fmt, ##args); }
    // Error-level logging. Error events that might still allow the application to continue.
    template<typename... Args> static void error(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::err, fmt, ##args); }
    // Critical-level logging. Very severe error events that will likely lead to application termination.
    template<typename... Args> static void critical(const char* fmt, const Args&... args) { LOG_MACRO(spdlog::level::critical, fmt, ##args); }

private:
    // Static shared pointer to the spdlog logger instance
    static std::shared_ptr<spdlog::logger> appLogger;

    // Private constructor to prevent instantiation
    Logger() = delete;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
};

#endif // LOGGER_HPP
```