```cpp
#include "Logger.hpp"
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>
#include <vector>

// Static shared pointer for the logger instance
std::shared_ptr<spdlog::logger> Logger::appLogger = nullptr;

// Maps string log level to spdlog::level::level_enum
spdlog::level::level_enum Logger::stringToLevel(const std::string& levelStr) {
    if (levelStr == "trace") return spdlog::level::trace;
    if (levelStr == "debug") return spdlog::level::debug;
    if (levelStr == "info") return spdlog::level::info;
    if (levelStr == "warn") return spdlog::level::warn;
    if (levelStr == "error") return spdlog::level::err;
    if (levelStr == "critical") return spdlog::level::critical;
    if (levelStr == "off") return spdlog::level::off;
    return spdlog::level::info; // Default to info
}

// Sets up the logger with specified file, level, and production mode.
void Logger::setup(const std::string& logFile, spdlog::level::level_enum level, bool productionMode) {
    if (appLogger) {
        // Already initialized, just set level
        appLogger->set_level(level);
        return;
    }

    std::vector<spdlog::sink_ptr> sinks;

    // Console sink (stdout with colors)
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_level(level); // Use global level
    sinks.push_back(console_sink);

    // File sink (rotating file)
    // Max 10MB per file, keep 3 files
    auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(logFile, 1024 * 1024 * 10, 3);
    file_sink->set_level(level); // Use global level
    sinks.push_back(file_sink);

    appLogger = std::make_shared<spdlog::logger>("app_logger", begin(sinks), end(sinks));
    appLogger->set_level(level);
    appLogger->flush_on(spdlog::level::warn); // Flush logs immediately on warnings/errors
    
    // Set pattern for logs
    if (productionMode) {
        // JSON format for production logs (easier for log aggregators)
        appLogger->set_pattern("%Y-%m-%dT%H:%M:%S.%f%z %^[%l]%$: %v"); // Example simplified JSON-like for console
        // For actual JSON, consider `spdlog/sinks/basic_file_sink.h` and serialize manually or use a specialized JSON sink
        // For actual production, a custom JSON formatter or a library like Boost.Log with JSON formatting would be ideal.
        // For simplicity in this project, we'll use a readable format but mark it as "production".
    } else {
        // Human-readable format for development
        appLogger->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    }

    spdlog::register_logger(appLogger);
    spdlog::set_default_logger(appLogger); // Make it the default logger
}
```