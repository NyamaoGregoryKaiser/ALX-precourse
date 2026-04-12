#pragma once

#include "spdlog/spdlog.h"
#include "spdlog/sinks/stdout_color_sinks.h"
#include "spdlog/sinks/basic_file_sink.h"
#include <string>
#include <memory>

class Logger {
public:
    static void init(const std::string& log_file = "app.log", spdlog::level::level_enum level = spdlog::level::info) {
        if (!initialized_) {
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(level);
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

            auto file_sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(log_file, true);
            file_sink->set_level(spdlog::level::trace); // File logs everything
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

            std::vector<spdlog::sink_ptr> sinks {console_sink, file_sink};
            logger_ = std::make_shared<spdlog::logger>("webscraper", begin(sinks), end(sinks));
            logger_->set_level(level);
            logger_->flush_on(spdlog::level::warn); // Flush log buffer on warnings/errors
            spdlog::set_default_logger(logger_);
            initialized_ = true;
            spdlog::info("Logger initialized with console and file output to {}", log_file);
        }
    }

    static std::shared_ptr<spdlog::logger> get_logger() {
        return logger_;
    }

private:
    static std::shared_ptr<spdlog::logger> logger_;
    static bool initialized_;
};

// Global logger macros for convenience
#define LOG_TRACE(...) Logger::get_logger()->trace(__VA_ARGS__)
#define LOG_DEBUG(...) Logger::get_logger()->debug(__VA_ARGS__)
#define LOG_INFO(...)  Logger::get_logger()->info(__VA_ARGS__)
#define LOG_WARN(...)  Logger::get_logger()->warn(__VA_ARGS__)
#define LOG_ERROR(...) Logger::get_logger()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) Logger::get_logger()->critical(__VA_ARGS__)