```cpp
#include "logger.h"
#include "config.h" // To get log level/file from config

std::shared_ptr<spdlog::logger> Logger::instance = nullptr;

void Logger::init() {
    if (instance) {
        return; // Already initialized
    }

    try {
        auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] %^%l%$: %v");

        auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            "logs/webscraper.log", 1048576 * 5, 3
        );
        file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] %v");

        instance = std::make_shared<spdlog::logger>("webscraper_logger", spdlog::sinks_init_list{console_sink, file_sink});
        instance->set_level(spdlog::level::info); // Default level
        instance->flush_on(spdlog::level::warn); // Flush log buffer on warnings and higher

        // Set log level from config
        std::string logLevelStr = Config::getInstance().getString("logging.level", "info");
        if (logLevelStr == "debug") instance->set_level(spdlog::level::debug);
        else if (logLevelStr == "info") instance->set_level(spdlog::level::info);
        else if (logLevelStr == "warn") instance->set_level(spdlog::level::warn);
        else if (logLevelStr == "error") instance->set_level(spdlog::level::error);
        else if (logLevelStr == "critical") instance->set_level(spdlog::level::critical);
        else instance->set_level(spdlog::level::info); // Fallback

        spdlog::set_default_logger(instance);
        spdlog::info("Logger initialized with level: {}", logLevelStr);

    } catch (const spdlog::spdlog_ex& ex) {
        // Fallback for logger initialization failure
        std::cerr << "Logger initialization failed: " << ex.what() << std::endl;
        // Create a basic logger to at least log errors to console
        instance = spdlog::stdout_color_mt("fallback_logger");
        instance->set_level(spdlog::level::err);
        instance->error("Fallback logger activated due to initialization failure: {}", ex.what());
    }
}

std::shared_ptr<spdlog::logger>& Logger::get() {
    if (!instance) {
        init(); // Lazy initialization if not already called
    }
    return instance;
}
```