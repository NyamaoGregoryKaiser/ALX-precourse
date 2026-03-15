#ifndef LOGGER_H
#define LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <string>
#include <vector>
#include <memory>
#include "../app_config.h"

namespace Logger {

    // Global logger instance
    inline std::shared_ptr<spdlog::logger> app_logger;

    // Function to initialize the logger
    void init() {
        if (app_logger) {
            return; // Already initialized
        }

        std::vector<spdlog::sink_ptr> sinks;

        // Console sink for development/stdout
        sinks.push_back(std::make_shared<spdlog::sinks::stdout_color_sink_mt>());

        // Rotating file sink for persistence
        sinks.push_back(std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            AppConfig::LOG_FILE_PATH,
            AppConfig::LOG_MAX_SIZE_MB * 1024 * 1024, // Convert MB to bytes
            AppConfig::LOG_MAX_FILES
        ));

        app_logger = std::make_shared<spdlog::logger>(AppConfig::APP_NAME, begin(sinks), end(sinks));
        spdlog::register_logger(app_logger);

        // Set logging level based on configuration
        if (AppConfig::LOG_LEVEL == "trace") {
            app_logger->set_level(spdlog::level::trace);
        } else if (AppConfig::LOG_LEVEL == "debug") {
            app_logger->set_level(spdlog::level::debug);
        } else if (AppConfig::LOG_LEVEL == "info") {
            app_logger->set_level(spdlog::level::info);
        } else if (AppConfig::LOG_LEVEL == "warn") {
            app_logger->set_level(spdlog::level::warn);
        } else if (AppConfig::LOG_LEVEL == "error") {
            app_logger->set_level(spdlog::level::err);
        } else if (AppConfig::LOG_LEVEL == "critical") {
            app_logger->set_level(spdlog::level::critical);
        } else {
            app_logger->set_level(spdlog::level::info); // Default to info
        }

        app_logger->flush_on(spdlog::level::err); // Flush immediately on error
        spdlog::set_pattern("[%Y-%m-%dT%H:%M:%S.%e%z] [%n] [%^%l%$] [thread %t] %v");
        app_logger->info("Logger initialized with level: {}", AppConfig::LOG_LEVEL);
    }

    // Convenience macros for logging
    #define LOG_TRACE(...) Logger::app_logger->trace(__VA_ARGS__)
    #define LOG_DEBUG(...) Logger::app_logger->debug(__VA_ARGS__)
    #define LOG_INFO(...)  Logger::app_logger->info(__VA_ARGS__)
    #define LOG_WARN(...)  Logger::app_logger->warn(__VA_ARGS__)
    #define LOG_ERROR(...) Logger::app_logger->error(__VA_ARGS__)
    #define LOG_CRITICAL(...) Logger::app_logger->critical(__VA_ARGS__)

} // namespace Logger

#endif // LOGGER_H