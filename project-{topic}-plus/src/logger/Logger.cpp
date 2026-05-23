#include "Logger.h"
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <stdexcept>

std::shared_ptr<spdlog::logger> Logger::_logger_instance;

void Logger::init_logger(const std::string& level_str) {
    if (!_logger_instance) {
        // Create sinks: console and file
        auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

        auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            "logs/ecommerce.log", 1048576 * 5, 3); // 5MB, 3 files
        file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

        _logger_instance = std::make_shared<spdlog::logger>("ecommerce", spdlog::sinks_init_list{console_sink, file_sink});
        _logger_instance->flush_on(spdlog::level::warn); // Flush log on warnings and errors

        spdlog::level::level_enum level;
        if (level_str == "debug") level = spdlog::level::debug;
        else if (level_str == "info") level = spdlog::level::info;
        else if (level_str == "warn") level = spdlog::level::warn;
        else if (level_str == "error") level = spdlog::level::err;
        else if (level_str == "critical") level = spdlog::level::critical;
        else {
            level = spdlog::level::info; // Default
            _logger_instance->warn("Unknown log level '{}', defaulting to 'info'.", level_str);
        }
        _logger_instance->set_level(level);

        spdlog::set_default_logger(_logger_instance); // Set as default logger for convenience
        spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [%n] [thread %t] %v");
        _logger_instance->info("Logger initialized with level: {}", level_str);
    }
}

std::shared_ptr<spdlog::logger> Logger::get_logger() {
    if (!_logger_instance) {
        // Fallback for cases where init_logger wasn't called (e.g., in unit tests)
        // In production, init_logger should always be called at startup.
        init_logger("info");
    }
    return _logger_instance;
}