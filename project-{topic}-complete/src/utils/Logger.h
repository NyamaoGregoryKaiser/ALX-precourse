```cpp
#ifndef LOGGER_H
#define LOGGER_H

#include <memory>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>

namespace PaymentProcessor {
namespace Utils {

class Logger {
public:
    static std::shared_ptr<spdlog::logger>& getLogger() {
        if (!logger_instance) {
            // Configure sinks
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(spdlog::level::trace);
            console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");

            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>("logs/payment_processor.log", 1048576 * 5, 3); // 5MB, 3 files
            file_sink->set_level(spdlog::level::info);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] %v");

            // Create logger with multiple sinks
            logger_instance = std::make_shared<spdlog::logger>("payment_processor_logger", spdlog::sinks_init_list{console_sink, file_sink});
            logger_instance->set_level(spdlog::level::trace); // Global logging level
            logger_instance->flush_on(spdlog::level::warn); // Flush log on warnings and errors
        }
        return logger_instance;
    }

private:
    static std::shared_ptr<spdlog::logger> logger_instance;
};

// Initialize static member
std::shared_ptr<spdlog::logger> Logger::logger_instance = nullptr;

// Convenience macros
#define LOG_TRACE(...) PaymentProcessor::Utils::Logger::getLogger()->trace(__VA_ARGS__)
#define LOG_DEBUG(...) PaymentProcessor::Utils::Logger::getLogger()->debug(__VA_ARGS__)
#define LOG_INFO(...) PaymentProcessor::Utils::Logger::getLogger()->info(__VA_ARGS__)
#define LOG_WARN(...) PaymentProcessor::Utils::Logger::getLogger()->warn(__VA_ARGS__)
#define LOG_ERROR(...) PaymentProcessor::Utils::Logger::getLogger()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) PaymentProcessor::Utils::Logger::getLogger()->critical(__VA_ARGS__)

} // namespace Utils
} // namespace PaymentProcessor

#endif // LOGGER_H
```