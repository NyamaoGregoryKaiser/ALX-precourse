```cpp
#include "Logger.h"

std::shared_ptr<spdlog::logger> Logger::logger_instance;

void Logger::init(const std::string& log_file_name, spdlog::level::level_enum level) {
    if (!logger_instance) {
        try {
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(level);
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");

            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(log_file_name, 1048576 * 5, 3); // 5MB, 3 files
            file_sink->set_level(spdlog::level::debug);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");

            logger_instance = std::make_shared<spdlog::logger>("aurora", spdlog::sinks_init_list{console_sink, file_sink});
            logger_instance->set_level(level);
            logger_instance->flush_on(spdlog::level::err);
            spdlog::set_default_logger(logger_instance); // Make it the default logger
            spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v"); // Global pattern for default logger
            Logger::info("Logger initialized. Log level: {}", spdlog::level::to_string_view(level));
        } catch (const spdlog::spdlog_ex& ex) {
            // Fallback to stderr if logger initialization fails
            std::cerr << "Logger initialization failed: " << ex.what() << std::endl;
        }
    }
}
```