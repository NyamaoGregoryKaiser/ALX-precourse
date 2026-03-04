```cpp
#ifndef VISGENIUS_LOGGER_H
#define VISGENIUS_LOGGER_H

#include <iostream>
#include <string>
#include <mutex>
#include <fstream>
#include <chrono>
#include <iomanip> // For std::put_time

namespace VisGenius {

enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL
};

class Logger {
public:
    static Logger& getInstance() {
        static Logger instance;
        return instance;
    }

    void setLogLevel(LogLevel level);
    void setLogFile(const std::string& filename);

    template <typename... Args>
    void log(LogLevel level, const std::string& format, Args... args) {
        if (level < m_logLevel) {
            return;
        }

        std::lock_guard<std::mutex> lock(m_mutex);

        std::string message = formatMessage(format, args...);
        std::string full_message = getTimestamp() + " [" + logLevelToString(level) + "] " + message + "\n";

        std::cout << full_message;
        if (m_logFile.is_open()) {
            m_logFile << full_message;
            m_logFile.flush();
        }
    }

private:
    Logger() : m_logLevel(INFO) {} // Default log level
    ~Logger() {
        if (m_logFile.is_open()) {
            m_logFile.close();
        }
    }

    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    std::string logLevelToString(LogLevel level) const;
    std::string getTimestamp() const;

    // A simple variadic template function to format messages (can be enhanced with fmt library)
    template <typename T>
    std::string formatSingle(std::string& format_str, size_t& pos, const T& arg) {
        size_t placeholder_pos = format_str.find("{}", pos);
        if (placeholder_pos != std::string::npos) {
            format_str.replace(placeholder_pos, 2, std::to_string(arg)); // Convert arg to string
            pos = placeholder_pos + std::to_string(arg).length();
        }
        return format_str;
    }

    std::string formatSingle(std::string& format_str, size_t& pos, const std::string& arg) {
        size_t placeholder_pos = format_str.find("{}", pos);
        if (placeholder_pos != std::string::npos) {
            format_str.replace(placeholder_pos, 2, arg);
            pos = placeholder_pos + arg.length();
        }
        return format_str;
    }

    // Base case for variadic template
    std::string formatMessage(std::string format_str) {
        return format_str;
    }

    // Recursive case for variadic template
    template <typename T, typename... Args>
    std::string formatMessage(std::string format_str, T first_arg, Args... rest_args) {
        size_t pos = 0;
        formatSingle(format_str, pos, first_arg);
        return formatMessage(format_str, rest_args...);
    }

    LogLevel m_logLevel;
    std::mutex m_mutex;
    std::ofstream m_logFile;
};

// Convenience macros
#define LOG_DEBUG(...) VisGenius::Logger::getInstance().log(VisGenius::DEBUG, __VA_ARGS__)
#define LOG_INFO(...) VisGenius::Logger::getInstance().log(VisGenius::INFO, __VA_ARGS__)
#define LOG_WARN(...) VisGenius::Logger::getInstance().log(VisGenius::WARN, __VA_ARGS__)
#define LOG_ERROR(...) VisGenius::Logger::getInstance().log(VisGenius::ERROR, __VA_ARGS__)
#define LOG_FATAL(...) VisGenius::Logger::getInstance().log(VisGenGeniuserius::FATAL, __VA_ARGS__)

} // namespace VisGenius

#endif // VISGENIUS_LOGGER_H
```