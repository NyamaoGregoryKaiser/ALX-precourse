```cpp
#include "Logger.h"

namespace Logger {
    void init() {
        if (spdlog::default_logger()->name() == "default") { // Check if default logger is already initialized by spdlog
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            auto logger = std::make_shared<spdlog::logger>("TaskAPI", console_sink);
            spdlog::set_default_logger(logger);
            spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

            // Set log level from config
            if (Config::isLoaded()) {
                std::string logLevelStr = Config::get<std::string>("LOG_LEVEL", "info");
                spdlog::set_level(stringToLogLevel(logLevelStr));
                LOG_INFO("Logger initialized with level: {}", logLevelStr);
            } else {
                spdlog::set_level(spdlog::level::info);
                LOG_INFO("Logger initialized with default level: info (Config not loaded yet)");
            }
        }
    }

    spdlog::level::level_enum stringToLogLevel(const std::string& levelStr) {
        if (levelStr == "trace") return spdlog::level::trace;
        if (levelStr == "debug") return spdlog::level::debug;
        if (levelStr == "info") return spdlog::level::info;
        if (levelStr == "warn") return spdlog::level::warn;
        if (levelStr == "error") return spdlog::level::error;
        if (levelStr == "critical") return spdlog::level::critical;
        if (levelStr == "off") return spdlog::level::off;
        return spdlog::level::info; // Default to info if string is unknown
    }
}
```