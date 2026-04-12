#include "logger.h"
#include <sstream>
#include <algorithm> // For std::transform

namespace Logger {

std::string level_to_string(Level level) {
    switch (level) {
        case Level::DEBUG: return "DEBUG";
        case Level::INFO:  return "INFO";
        case Level::WARN:  return "WARN";
        case Level::ERROR: return "ERROR";
        default:           return "UNKNOWN";
    }
}

Level string_to_level(const std::string& level_str) {
    std::string upper_str = level_str;
    std::transform(upper_str.begin(), upper_str.end(), upper_str.begin(), ::toupper);

    if (upper_str == "DEBUG") return Level::DEBUG;
    if (upper_str == "INFO")  return Level::INFO;
    if (upper_str == "WARN")  return Level::WARN;
    if (upper_str == "ERROR") return Level::ERROR;
    return Level::INFO; // Default to INFO if invalid string
}

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::init(const std::string& filepath, Level min_level) {
    std::lock_guard<std::mutex> lock(mutex_);
    min_log_level_ = min_level;

    // Ensure directory exists
    // This is a basic approach; for robust solutions, consider platform-specific APIs or libraries.
    std::string dir = filepath.substr(0, filepath.find_last_of('/'));
    if (!dir.empty()) {
        #ifdef _WIN32
            // Windows specific directory creation
            _mkdir(dir.c_str());
        #else
            // Linux/Unix specific directory creation
            system(("mkdir -p " + dir).c_str());
        #endif
    }

    log_file_stream_.open(filepath, std::ios::app);
    if (!log_file_stream_.is_open()) {
        std::cerr << "Logger: Failed to open log file at " << filepath << std::endl;
    } else {
        std::cout << "Logger: Initialized. Log file: " << filepath << ", Min Level: " << level_to_string(min_log_level_) << std::endl;
    }
}

Logger::~Logger() {
    if (log_file_stream_.is_open()) {
        log_file_stream_.close();
    }
}

void Logger::log(Level level, const std::string& message, const std::string& file, int line) {
    if (level < min_log_level_) {
        return; // Message level is below the minimum configured level
    }

    std::lock_guard<std::mutex> lock(mutex_);

    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");

    std::string level_str = level_to_string(level);
    std::string log_entry = "[" + ss.str() + "][" + level_str + "]";

    if (!file.empty()) {
        size_t last_slash = file.find_last_of("/\\");
        std::string filename = (last_slash == std::string::npos) ? file : file.substr(last_slash + 1);
        log_entry += "[" + filename + ":" + std::to_string(line) + "]";
    }
    log_entry += " " + message;

    // Output to console (std::cout for INFO/DEBUG, std::cerr for WARN/ERROR)
    if (level == Level::ERROR || level == Level::WARN) {
        std::cerr << log_entry << std::endl;
    } else {
        std::cout << log_entry << std::endl;
    }

    // Output to file if open
    if (log_file_stream_.is_open()) {
        log_file_stream_ << log_entry << std::endl;
        log_file_stream_.flush(); // Ensure message is written immediately
    }
}

void Logger::debug(const std::string& message, const std::string& file, int line) {
    log(Level::DEBUG, message, file, line);
}

void Logger::info(const std::string& message, const std::string& file, int line) {
    log(Level::INFO, message, file, line);
}

void Logger::warn(const std::string& message, const std::string& file, int line) {
    log(Level::WARN, message, file, line);
}

void Logger::error(const std::string& message, const std::string& file, int line) {
    log(Level::ERROR, message, file, line);
}

} // namespace Logger
```