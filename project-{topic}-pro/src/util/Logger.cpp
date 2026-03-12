```cpp
#include "util/Logger.hpp"
#include <stdexcept>

std::shared_ptr<spdlog::logger> Logger::instance = nullptr;

void Logger::init(const std::string& appName, const std::string& logLevel, const std::string& logFilePath) {
    if (instance) {
        return; // Already initialized
    }

    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [%s:%#] %v"); // Add source file and line

    std::vector<spdlog::sink_ptr> sinks;
    sinks.push_back(console_sink);

    if (!logFilePath.empty()) {
        auto file_sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(logFilePath, true);
        file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [%s:%#] %v");
        sinks.push_back(file_sink);
    }

    instance = std::make_shared<spdlog::logger>(appName, begin(sinks), end(sinks));

    spdlog::level::level_enum level;
    if (logLevel == "trace") level = spdlog::level::trace;
    else if (logLevel == "debug") level = spdlog::level::debug;
    else if (logLevel == "info") level = spdlog::level::info;
    else if (logLevel == "warn") level = spdlog::level::warn;
    else if (logLevel == "error") level = spdlog::level::err;
    else if (logLevel == "critical") level = spdlog::level::critical;
    else level = spdlog::level::info; // Default

    instance->set_level(level);
    instance->flush_on(spdlog::level::info); // Flush log buffer on info and higher levels

    // Register this logger as the default for spdlog functions like spdlog::info()
    spdlog::set_default_logger(instance);
    spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [%s:%#] %v"); // Default pattern for global logger
    spdlog::debug("Logger initialized with level: {}", levelToString(level));
}

std::shared_ptr<spdlog::logger> Logger::get() {
    if (!instance) {
        throw std::runtime_error("Logger not initialized. Call Logger::init() first.");
    }
    return instance;
}

std::string Logger::levelToString(spdlog::level::level_enum level) {
    switch (level) {
        case spdlog::level::trace: return "TRACE";
        case spdlog::level::debug: return "DEBUG";
        case spdlog::level::info: return "INFO";
        case spdlog::level::warn: return "WARN";
        case spdlog::level::err: return "ERROR";
        case spdlog::level::critical: return "CRITICAL";
        case spdlog::level::off: return "OFF";
        default: return "UNKNOWN";
    }
}
```