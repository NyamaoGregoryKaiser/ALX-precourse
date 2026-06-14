```cpp
#ifndef AURORA_METRICS_LOGGER_H
#define AURORA_METRICS_LOGGER_H

#include <string>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>

class Logger {
public:
    static void init(const std::string& log_file_name = "aurora_metrics.log",
                     spdlog::level::level_enum level = spdlog::level::info);

    template<typename... Args>
    static void debug(const std::string& format, Args&&... args) {
        if (logger_instance) {
            logger_instance->debug(format, std::forward<Args>(args)...);
        }
    }

    template<typename... Args>
    static void info(const std::string& format, Args&&... args) {
        if (logger_instance) {
            logger_instance->info(format, std::forward<Args>(args)...);
        }
    }

    template<typename... Args>
    static void warn(const std::string& format, Args&&... args) {
        if (logger_instance) {
            logger_instance->warn(format, std::forward<Args>(args)...);
        }
    }

    template<typename... Args>
    static void error(const std::string& format, Args&&... args) {
        if (logger_instance) {
            logger_instance->error(format, std::forward<Args>(args)...);
        }
    }

    template<typename... Args>
    static void critical(const std::string& format, Args&&... args) {
        if (logger_instance) {
            logger_instance->critical(format, std::forward<Args>(args)...);
        }
    }

private:
    static std::shared_ptr<spdlog::logger> logger_instance;
};

#endif // AURORA_METRICS_LOGGER_H
```