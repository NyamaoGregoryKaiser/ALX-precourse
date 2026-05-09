```cpp
#include "Logger.h"
#include <iostream>

namespace VisuFlow {
namespace Util {

std::shared_ptr<spdlog::logger> Logger::s_logger = nullptr;
std::once_flag Logger::s_onceFlag;

void Logger::init(const std::string& logLevelString, const std::string& logFileName,
                  size_t maxFileSize, size_t maxFiles) {
    std::call_once(s_onceFlag, [&]() {
        try {
            // Console sink with colors
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(stringToLogLevel(logLevelString));
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

            // File sink with rotation
            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(logFileName, maxFileSize, maxFiles);
            file_sink->set_level(stringToLogLevel(logLevelString));
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] [%s:%#] %v"); // Include source file and line

            s_logger = std::make_shared<spdlog::logger>("visuflow_logger", spdlog::sinks_init_list{console_sink, file_sink});
            s_logger->set_level(stringToLogLevel(logLevelString));
            s_logger->flush_on(spdlog::level::err); // Flush on error and critical levels
            spdlog::set_default_logger(s_logger);
            spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v"); // Default pattern for convenience
            s_logger->info("Logger initialized with level: {} and file: {}", logLevelString, logFileName);
        } catch (const spdlog::spdlog_ex& ex) {
            std::cerr << "Logger initialization failed: " << ex.what() << std::endl;
            // Fallback to basic logging if spdlog fails
            s_logger = nullptr;
        }
    });
}

std::shared_ptr<spdlog::logger> Logger::getInstance() {
    if (!s_logger) {
        throw std::runtime_error("Logger not initialized. Call Logger::init() first.");
    }
    return s_logger;
}

spdlog::level::level_enum Logger::stringToLogLevel(const std::string& levelString) {
    if (levelString == "trace") return spdlog::level::trace;
    if (levelString == "debug") return spdlog::level::debug;
    if (levelString == "info") return spdlog::level::info;
    if (levelString == "warn") return spdlog::level::warn;
    if (levelString == "error") return spdlog::level::err;
    if (levelString == "critical") return spdlog::level::critical;
    return spdlog::level::info; // Default
}

} // namespace Util
} // namespace VisuFlow
```