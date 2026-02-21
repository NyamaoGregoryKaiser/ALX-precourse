```cpp
#ifndef LOGGER_H
#define LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>

class Logger {
public:
    static void init() {
        if (!initialized) {
            // Console sink
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(spdlog::level::debug);
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] %^[%l]%$: %v");

            // File sink (e.g., rotating file)
            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>("logs/app.log", 1048576 * 5, 3); // 5MB, 3 files
            file_sink->set_level(spdlog::level::info);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

            // Create logger with both sinks
            std::vector<spdlog::sink_ptr> sinks {console_sink, file_sink};
            logger = std::make_shared<spdlog::logger>("app_logger", begin(sinks), end(sinks));
            logger->set_level(spdlog::level::debug); // Overall logger level
            logger->flush_on(spdlog::level::warn); // Flush log on warnings and errors
            spdlog::set_default_logger(logger);
            spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] %^[%l]%$: %v"); // Default pattern for global functions if used

            initialized = true;
        }
    }

    static std::shared_ptr<spdlog::logger>& get_logger() {
        if (!initialized) {
            init(); // Ensure logger is initialized if someone tries to get it before main init
        }
        return logger;
    }

private:
    static std::shared_ptr<spdlog::logger> logger;
    static bool initialized;

    Logger() = delete; // Prevent instantiation
};

// Define static members
std::shared_ptr<spdlog::logger> Logger::logger;
bool Logger::initialized = false;

// Convenience macros
#define LOG_TRACE(...) spdlog::get("app_logger")->trace(__VA_ARGS__)
#define LOG_DEBUG(...) spdlog::get("app_logger")->debug(__VA_ARGS__)
#define LOG_INFO(...)  spdlog::get("app_logger")->info(__VA_ARGS__)
#define LOG_WARN(...)  spdlog::get("app_logger")->warn(__VA_ARGS__)
#define LOG_ERROR(...) spdlog::get("app_logger")->error(__VA_ARGS__)
#define LOG_CRITICAL(...) spdlog::get("app_logger")->critical(__VA_ARGS__)

#endif // LOGGER_H

```