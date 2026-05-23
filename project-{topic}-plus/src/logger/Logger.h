#ifndef LOGGER_H
#define LOGGER_H

#include <memory>
#include <spdlog/spdlog.h>

class Logger {
public:
    static std::shared_ptr<spdlog::logger> get_logger();
    static void init_logger(const std::string& level_str);

private:
    Logger() = delete; // Static class
    static std::shared_ptr<spdlog::logger> _logger_instance;
};

#endif // LOGGER_H