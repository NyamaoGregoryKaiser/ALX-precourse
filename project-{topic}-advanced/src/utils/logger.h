```cpp
#ifndef MOBILE_BACKEND_LOGGER_H
#define MOBILE_BACKEND_LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>

namespace mobile_backend {
namespace utils {

// Singleton for logging
class Logger {
public:
    static std::shared_ptr<spdlog::logger>& get_logger() {
        if (!instance) {
            // Create console sink
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(spdlog::level::trace);
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");

            // Create rotating file sink (log to file, max 10MB, keep 3 files)
            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>("logs/mobile_backend.log", 1024 * 1024 * 10, 3);
            file_sink->set_level(spdlog::level::info);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] %v");

            // Combine sinks
            spdlog::sinks_init_list sink_list = {console_sink, file_sink};
            instance = std::make_shared<spdlog::logger>("mobile_backend_logger", sink_list.begin(), sink_list.end());

            // Set global logging level for the logger
            instance->set_level(spdlog::level::trace);
            instance->flush_on(spdlog::level::warn); // Flush log on warning and higher
        }
        return instance;
    }

private:
    Logger() = default; // Private constructor to prevent instantiation
    static std::shared_ptr<spdlog::logger> instance;
};

// Define the static member
std::shared_ptr<spdlog::logger> Logger::instance = nullptr;

// Convenience macros for logging
#define LOG_TRACE(...) mobile_backend::utils::Logger::get_logger()->trace(__VA_ARGS__)
#define LOG_DEBUG(...) mobile_backend::utils::Logger::get_logger()->debug(__VA_ARGS__)
#define LOG_INFO(...)  mobile_backend::utils::Logger::get_logger()->info(__VA_ARGS__)
#define LOG_WARN(...)  mobile_backend::utils::Logger::get_logger()->warn(__VA_ARGS__)
#define LOG_ERROR(...) mobile_backend::utils::Logger::get_logger()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) mobile_backend::utils::Logger::get_logger()->critical(__VA_ARGS__)

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_LOGGER_H
```