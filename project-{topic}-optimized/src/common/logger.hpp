#ifndef CMS_LOGGER_HPP
#define CMS_LOGGER_HPP

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <string>
#include <memory>

namespace cms::common {

class Logger {
public:
    static std::shared_ptr<spdlog::logger>& get_logger() {
        if (!logger_) {
            // Create a color console logger
            logger_ = spdlog::stdout_color_mt("cms_logger");
            logger_->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
            spdlog::set_default_logger(logger_);
            spdlog::set_level(spdlog::level::info); // Default level
        }
        return logger_;
    }

    static void set_level(const std::string& level_str) {
        if (!logger_) {
            get_logger(); // Initialize if not already
        }
        if (level_str == "trace") spdlog::set_level(spdlog::level::trace);
        else if (level_str == "debug") spdlog::set_level(spdlog::level::debug);
        else if (level_str == "info") spdlog::set_level(spdlog::level::info);
        else if (level_str == "warn") spdlog::set_level(spdlog::level::warn);
        else if (level_str == "error") spdlog::set_level(spdlog::level::err);
        else if (level_str == "critical") spdlog::set_level(spdlog::level::critical);
        else if (level_str == "off") spdlog::set_level(spdlog::level::off);
        else {
            SPDLOG_WARN("Unknown log level: {}. Defaulting to info.", level_str);
            spdlog::set_level(spdlog::level::info);
        }
        SPDLOG_INFO("Log level set to: {}", level_str);
    }

private:
    static std::shared_ptr<spdlog::logger> logger_;
};

// Initialize static member
std::shared_ptr<spdlog::logger> Logger::logger_ = nullptr;

} // namespace cms::common

// Convenient macros for logging
#define LOG_TRACE(...) cms::common::Logger::get_logger()->trace(__VA_ARGS__)
#define LOG_DEBUG(...) cms::common::Logger::get_logger()->debug(__VA_ARGS__)
#define LOG_INFO(...) cms::common::Logger::get_logger()->info(__VA_ARGS__)
#define LOG_WARN(...) cms::common::Logger::get_logger()->warn(__VA_ARGS__)
#define LOG_ERROR(...) cms::common::Logger::get_logger()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) cms::common::Logger::get_logger()->critical(__VA_ARGS__)

#endif // CMS_LOGGER_HPP
```