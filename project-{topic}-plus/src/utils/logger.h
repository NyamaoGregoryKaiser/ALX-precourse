#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <string>
#include <memory>
#include <stdexcept>

class Logger {
public:
    static void init(const std::string& level = "info") {
        if (!initialized_) {
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            // [YYYY-MM-DD HH:MM:SS.mmm] [level] [thread_id] [file:line] message
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [%t] [%s:%#] %v");
            
            logger_ = std::make_shared<spdlog::logger>("project_management_api", console_sink);
            
            // Set log level
            if (level == "trace") logger_->set_level(spdlog::level::trace);
            else if (level == "debug") logger_->set_level(spdlog::level::debug);
            else if (level == "info") logger_->set_level(spdlog::level::info);
            else if (level == "warn") logger_->set_level(spdlog::level::warn);
            else if (level == "error") logger_->set_level(spdlog::level::err);
            else if (level == "critical") logger_->set_level(spdlog::level::critical);
            else if (level == "off") logger_->set_level(spdlog::level::off);
            else logger_->set_level(spdlog::level::info); // Default to info

            logger_->flush_on(spdlog::level::err); // Flush on error and critical
            spdlog::set_default_logger(logger_);
            initialized_ = true;
            spdlog::info("Logger initialized with level: {}", level);
        }
    }

    static std::shared_ptr<spdlog::logger>& getLogger() {
        if (!initialized_) {
            // If not initialized explicitly, do a default initialization
            init("info");
        }
        return logger_;
    }

    // Convenience macros for logging
    template<typename... Args>
    static void trace(const std::string& fmt, const Args&... args) {
        getLogger()->trace(fmt, args...);
    }

    template<typename... Args>
    static void debug(const std::string& fmt, const Args&... args) {
        getLogger()->debug(fmt, args...);
    }

    template<typename... Args>
    static void info(const std::string& fmt, const Args&... args) {
        getLogger()->info(fmt, args...);
    }

    template<typename... Args>
    static void warn(const std::string& fmt, const Args&... args) {
        getLogger()->warn(fmt, args...);
    }

    template<typename... Args>
    static void error(const std::string& fmt, const Args&... args) {
        getLogger()->error(fmt, args...);
    }

    template<typename... Args>
    static void critical(const std::string& fmt, const Args&... args) {
        getLogger()->critical(fmt, args...);
    }

private:
    static inline std::shared_ptr<spdlog::logger> logger_;
    static inline bool initialized_ = false;

    // Private constructor to prevent instantiation
    Logger() = default;
};
```