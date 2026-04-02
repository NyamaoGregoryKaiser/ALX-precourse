```cpp
#ifndef LOGGER_H
#define LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>
#include <string>

namespace TaskManager {
namespace Utils {

class Logger {
public:
    static std::shared_ptr<spdlog::logger> getLogger();
    static void init(const std::string& level = "info");

private:
    static std::shared_ptr<spdlog::logger> s_logger;
};

} // namespace Utils
} // namespace TaskManager

#endif // LOGGER_H
```