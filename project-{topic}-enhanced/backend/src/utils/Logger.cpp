```cpp
#include "Logger.h"
#include <spdlog/sinks/stdout_color_sinks.h> // For console output

std::shared_ptr<spdlog::logger> Logger::console_logger;
std::string Logger::log_level_str;

void Logger::init(const std::string& level_str) {
    if (!console_logger) {
        console_logger = spdlog::stdout_color_mt("console");
        console_logger->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    }

    log_level_str = level_str;
    spdlog::level::level_enum level;
    if (level_str == "trace") level = spdlog::level::trace;
    else if (level_str == "debug") level = spdlog::level::debug;
    else if (level_str == "info") level = spdlog::level::info;
    else if (level_str == "warn") level = spdlog::level::warn;
    else if (level_str == "error") level = spdlog::level::err;
    else if (level_str == "critical") level = spdlog::level::critical;
    else level = spdlog::level::info; // Default to info

    console_logger->set_level(level);
    spdlog::set_default_logger(console_logger); // Set as default for convenience
    Logger::info("Logger initialized with level: {}", level_str);
}
```