#include "Logger.h"
#include "config/config.h" // For getting log level and file from config

namespace tm_api {
namespace utils {

std::shared_ptr<spdlog::logger> Logger::instance = nullptr;

void Logger::init(spdlog::level::level_enum level, const std::string& logFile, size_t maxFileSize, size_t maxFiles) {
    if (instance) {
        // Logger already initialized, just update level if different
        instance->set_level(level);
        return;
    }

    std::vector<spdlog::sink_ptr> sinks;

    // Console sink with colors
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    console_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    sinks.push_back(console_sink);

    // File sink
    std::string effectiveLogFile = logFile.empty() ? Config::getLogFile() : logFile;
    if (!effectiveLogFile.empty()) {
        try {
            // Ensure log directory exists
            std::filesystem::path logDirPath = std::filesystem::path(effectiveLogFile).parent_path();
            if (!logDirPath.empty() && !std::filesystem::exists(logDirPath)) {
                std::filesystem::create_directories(logDirPath);
            }

            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(effectiveLogFile, maxFileSize, maxFiles);
            file_sink->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [thread %t] %v");
            sinks.push_back(file_sink);
        } catch (const std::filesystem::filesystem_error& e) {
            std::cerr << "Error creating log directory or file sink: " << e.what() << std::endl;
            // Fallback to console only
        }
    }

    instance = std::make_shared<spdlog::logger>("task_manager_logger", begin(sinks), end(sinks));
    instance->set_level(level);
    instance->flush_on(spdlog::level::err); // Flush on error to ensure critical logs are written
    spdlog::set_default_logger(instance);

    // Convert string log level from config to spdlog enum
    std::string configLevel = Config::getLogLevel();
    if (configLevel == "debug") {
        instance->set_level(spdlog::level::debug);
    } else if (configLevel == "info") {
        instance->set_level(spdlog::level::info);
    } else if (configLevel == "warn") {
        instance->set_level(spdlog::level::warn);
    } else if (configLevel == "error") {
        instance->set_level(spdlog::level::err);
    } else if (configLevel == "critical") {
        instance->set_level(spdlog::level::critical);
    } else {
        instance->set_level(spdlog::level::info); // Default to info if unknown
    }
}

std::shared_ptr<spdlog::logger>& Logger::getLogger() {
    if (!instance) {
        // If not explicitly initialized, initialize with default settings
        init();
    }
    return instance;
}

} // namespace utils
} // namespace tm_api