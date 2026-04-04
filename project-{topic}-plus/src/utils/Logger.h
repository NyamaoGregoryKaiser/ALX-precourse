#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>
#include <string>

// Define global logger macros for convenience
#define LOG_DEBUG(...) tm_api::utils::Logger::getLogger()->debug(__VA_ARGS__)
#define LOG_INFO(...) tm_api::utils::Logger::getLogger()->info(__VA_ARGS__)
#define LOG_WARN(...) tm_api::utils::Logger::getLogger()->warn(__VA_ARGS__)
#define LOG_ERROR(...) tm_api::utils::Logger::getLogger()->error(__VA_ARGS__)
#define LOG_CRITICAL(...) tm_api::utils::Logger::getLogger()->critical(__VA_ARGS__)

namespace tm_api {
namespace utils {

class Logger {
public:
    static void init(spdlog::level::level_enum level = spdlog::level::info,
                     const std::string& logFile = "",
                     size_t maxFileSize = 1048576 * 5, // 5 MB
                     size_t maxFiles = 3);

    static std::shared_ptr<spdlog::logger>& getLogger();

private:
    Logger() = delete;
    static std::shared_ptr<spdlog::logger> instance;
};

} // namespace utils
} // namespace tm_api