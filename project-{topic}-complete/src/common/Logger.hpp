```cpp
#ifndef MLTOOLKIT_LOGGER_HPP
#define MLTOOLKIT_LOGGER_HPP

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/basic_file_sink.h>
#include <memory>
#include <string>

namespace MLToolkit {
namespace Common {

class Logger {
public:
    // Initialize global logger with console and file sinks
    static void init(const std::string& log_file_path, spdlog::level::level_enum level = spdlog::level::info) {
        if (!initialized_) {
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

            auto file_sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(log_file_path, true);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

            spdlog::set_default_logger(std::make_shared<spdlog::logger>("ml_toolkit", spdlog::sinks_init_list({console_sink, file_sink})));
            spdlog::set_level(level);
            spdlog::flush_on(spdlog::level::warn); // Flush log buffer on warnings and above
            spdlog::info("Logger initialized. Log file: {}", log_file_path);
            initialized_ = true;
        }
    }

    // Get the global logger instance
    static std::shared_ptr<spdlog::logger> get() {
        if (!initialized_) {
            // Fallback for cases where init might not have been explicitly called
            // In a production setup, init() should always be called at startup.
            init("ml_toolkit_default.log");
        }
        return spdlog::get("ml_toolkit");
    }

private:
    static bool initialized_;
};

} // namespace Common
} // namespace MLToolkit

// Convenience macros for logging
#define LOG_TRACE(...) MLToolkit::Common::Logger::get()->trace(__VA_ARGS__)
#define LOG_DEBUG(...) MLToolkit::Common::Logger::get()->debug(__VA_ARGS__)
#define LOG_INFO(...)  MLToolkit::Common::Logger::get()->info(__VA_ARGS__)
#define LOG_WARN(...)  MLToolkit::Common::Logger::get()->warn(__VA_ARGS__)
#define LOG_ERROR(...) MLToolkit::Common::Logger::get()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) MLToolkit::Common::Logger::get()->critical(__VA_ARGS__)

#endif // MLTOOLKIT_LOGGER_HPP
```