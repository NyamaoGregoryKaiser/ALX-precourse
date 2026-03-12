```cpp
#ifndef PAYMENT_PROCESSOR_LOGGER_HPP
#define PAYMENT_PROCESSOR_LOGGER_HPP

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/basic_file_sink.h>
#include <string>
#include <memory>

class Logger {
public:
    static void init(const std::string& appName, const std::string& logLevel, const std::string& logFilePath = "");
    static std::shared_ptr<spdlog::logger> get();

private:
    static std::shared_ptr<spdlog::logger> instance;
    static std::string levelToString(spdlog::level::level_enum level);
};

#endif // PAYMENT_PROCESSOR_LOGGER_HPP
```