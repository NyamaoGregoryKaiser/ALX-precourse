```cpp
#include "Logger.h"
#include <stdexcept>
#include <map>

namespace TaskManager {
namespace Utils {

std::shared_ptr<spdlog::logger> Logger::s_logger = nullptr;

void Logger::init(const std::string& level) {
    if (s_logger) {
        return; // Already initialized
    }

    try {
        auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

        // Create a rotating file sink for logs
        auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            "logs/task_manager.log", 1048576 * 5, 3); // 5MB max size, 3 rotating files
        file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

        s_logger = std::make_shared<spdlog::logger>("TaskManager", spdlog::sinks_init_list({console_sink, file_sink}));
        spdlog::register_logger(s_logger);

        // Set log level
        std::map<std::string, spdlog::level::level_enum> level_map = {
            {"trace", spdlog::level::trace},
            {"debug", spdlog::level::debug},
            {"info", spdlog::level::info},
            {"warn", spdlog::level::warn},
            {"error", spdlog::level::err},
            {"critical", spdlog::level::critical},
            {"off", spdlog::level::off}
        };

        auto it = level_map.find(level);
        if (it != level_map.end()) {
            s_logger->set_level(it->second);
        } else {
            s_logger->warn("Invalid log level specified: {}. Defaulting to 'info'.", level);
            s_logger->set_level(spdlog::level::info);
        }

        s_logger->flush_on(spdlog::level::err); // Flush immediately on error or higher
        s_logger->info("Logger initialized with level: {}", level);

    } catch (const spdlog::spdlog_ex& ex) {
        // Fallback if spdlog fails to initialize
        std::cerr << "Logger initialization failed: " << ex.what() << std::endl;
        // Optionally, rethrow or exit for critical initialization failure
    }
}

std::shared_ptr<spdlog::logger> Logger::getLogger() {
    if (!s_logger) {
        // Should ideally be initialized once at startup.
        // If called before init, provide a default minimal logger or throw.
        // For robustness, we'll initialize with default settings here.
        init("info");
        s_logger->warn("Logger::getLogger() called before Logger::init(). Initializing with default 'info' level.");
    }
    return s_logger;
}

} // namespace Utils
} // namespace TaskManager
```