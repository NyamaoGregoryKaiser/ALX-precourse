```cpp
#include "Logger.hpp"
#include <iostream>
#include <chrono>
#include <ctime>
#include <iomanip> // For std::put_time

LogLevel Logger::current_log_level = LogLevel::INFO;
std::ofstream Logger::log_file;
std::mutex Logger::log_mutex;
bool Logger::is_initialized = false;

void Logger::init(LogLevel level, const std::string& filename) {
    std::lock_guard<std::mutex> lock(log_mutex);
    if (is_initialized) {
        // Logger already initialized, perhaps reconfigure level or just return.
        // For simplicity, we just set the level.
        current_log_level = level;
        return;
    }

    current_log_level = level;
    log_file.open(filename, std::ios::app); // Open in append mode
    if (!log_file.is_open()) {
        std::cerr << "Error: Could not open log file: " << filename << std::endl;
        // Proceed without file logging, only to console
    }
    is_initialized = true;
    log(LogLevel::INFO, "Logger initialized with level " + logLevelToString(level) + " to file " + filename);
}

void Logger::log(LogLevel level, const std::string& message) {
    if (!is_initialized) {
        // Fallback if logger not explicitly initialized, use default INFO level and no file.
        // This can happen if a log message occurs before main() finishes initialization.
        // For robustness, ensure Logger::init() is called early in main.
        static bool default_init_done = false;
        if (!default_init_done) {
            init(LogLevel::INFO, "app.log"); // Default init
            default_init_done = true;
        }
    }

    if (level < current_log_level) {
        return; // Filter out messages below the current log level
    }

    std::lock_guard<std::mutex> lock(log_mutex);
    std::string timestamp = getCurrentTimestamp();
    std::string level_str = logLevelToString(level);
    std::string formatted_message = "[" + timestamp + "] [" + level_str + "] " + message;

    // Log to console
    std::cout << formatted_message << std::endl;

    // Log to file if open
    if (log_file.is_open()) {
        log_file << formatted_message << std::endl;
        log_file.flush(); // Ensure log is written immediately
    }
}

void Logger::close() {
    std::lock_guard<std::mutex> lock(log_mutex);
    if (log_file.is_open()) {
        log_file.close();
        is_initialized = false;
    }
}

std::string Logger::logLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO: return "INFO";
        case LogLevel::WARNING: return "WARNING";
        case LogLevel::ERROR: return "ERROR";
        case LogLevel::CRITICAL: return "CRITICAL";
        default: return "UNKNOWN";
    }
}

std::string Logger::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}
```