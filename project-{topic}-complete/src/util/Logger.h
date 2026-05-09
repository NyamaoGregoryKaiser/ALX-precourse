```cpp
#ifndef VISUFLOW_LOGGER_H
#define VISUFLOW_LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>
#include <string>

namespace VisuFlow {
namespace Util {

/**
 * @brief Singleton wrapper for `spdlog` to provide centralized and flexible logging.
 */
class Logger {
public:
    Logger(const Logger&) = delete; // Delete copy constructor
    Logger& operator=(const Logger&) = delete; // Delete assignment operator

    /**
     * @brief Initializes the logger with specified level and file.
     * Must be called once at application startup.
     * @param logLevelString The minimum logging level (e.g., "info", "debug", "warn").
     * @param logFileName The file to log to.
     * @param maxFileSize Maximum size of the log file before rotation (default: 5MB).
     * @param maxFiles Maximum number of rotated log files (default: 3).
     */
    static void init(const std::string& logLevelString,
                     const std::string& logFileName,
                     size_t maxFileSize = 1024 * 1024 * 5,
                     size_t maxFiles = 3);

    /**
     * @brief Gets the singleton instance of the spdlog logger.
     * @return A shared_ptr to the spdlog::logger instance.
     * @throws std::runtime_error if logger not initialized.
     */
    static std::shared_ptr<spdlog::logger> getInstance();

    /**
     * @brief Logs a message at a specified level.
     * @tparam Args Argument types for `spdlog::format_string`.
     * @param level The logging level (e.g., spdlog::level::info).
     * @param format The format string for the message.
     * @param args Arguments to format the message.
     */
    template<typename... Args>
    static void log(spdlog::level::level_enum level, const spdlog::format_string& format, Args&&... args) {
        if (s_logger) {
            s_logger->log(level, format, std::forward<Args>(args)...);
        } else {
            // Fallback to cerr if logger not initialized (shouldn't happen in production)
            std::cerr << "[UNINITIALIZED LOGGER] " << spdlog::level::to_string(level) << ": ";
            // Attempt to print the format string itself, as args would be too complex
            // For a robust fallback, you'd need a simpler formatting mechanism here.
            std::cerr << format.str() << std::endl;
        }
    }

private:
    Logger() = default; // Private constructor for Singleton

    static std::shared_ptr<spdlog::logger> s_logger;
    static std::once_flag s_onceFlag;

    /**
     * @brief Converts a string log level to `spdlog::level::level_enum`.
     * @param levelString The string representation of the log level.
     * @return The corresponding `spdlog::level::level_enum`.
     */
    static spdlog::level::level_enum stringToLogLevel(const std::string& levelString);
};

} // namespace Util
} // namespace VisuFlow

#endif // VISUFLOW_LOGGER_H
```