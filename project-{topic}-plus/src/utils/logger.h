#pragma once

#include <string>
#include <fstream>
#include <mutex>
#include <chrono>
#include <iomanip> // For std::put_time
#include <iostream> // For std::cout, std::cerr

namespace Logger {

enum class Level {
    DEBUG,
    INFO,
    WARN,
    ERROR
};

// Convert Level to string
std::string level_to_string(Level level);

// Convert string to Level
Level string_to_level(const std::string& level_str);

class Logger {
public:
    static Logger& getInstance();

    // Initialize the logger with file path and minimum log level
    void init(const std::string& filepath, Level min_level);

    // Log a message at a specific level
    void log(Level level, const std::string& message, const std::string& file = "", int line = 0);

    // Convenience methods
    void debug(const std::string& message, const std::string& file = "", int line = 0);
    void info(const std::string& message, const std::string& file = "", int line = 0);
    void warn(const std::string& message, const std::string& file = "", int line = 0);
    void error(const std::string& message, const std::string& file = "", int line = 0);

private:
    Logger() = default; // Private constructor for singleton
    ~Logger(); // Close file stream

    // Delete copy constructor and assignment operator
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    std::ofstream log_file_stream_;
    std::mutex mutex_;
    Level min_log_level_ = Level::INFO; // Default minimum level
};

} // namespace Logger

// Macro for logging with file and line information
#define LOG_DEBUG(msg) Logger::Logger::getInstance().debug(msg, __FILE__, __LINE__)
#define LOG_INFO(msg) Logger::Logger::getInstance().info(msg, __FILE__, __LINE__)
#define LOG_WARN(msg) Logger::Logger::getInstance().warn(msg, __FILE__, __LINE__)
#define LOG_ERROR(msg) Logger::Logger::getInstance().error(msg, __FILE__, __LINE__)
```