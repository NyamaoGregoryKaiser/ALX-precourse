```cpp
#include "Logger.h"

namespace VisGenius {

void Logger::setLogLevel(LogLevel level) {
    m_logLevel = level;
    LOG_INFO("Log level set to {}", logLevelToString(level));
}

void Logger::setLogFile(const std::string& filename) {
    if (m_logFile.is_open()) {
        m_logFile.close();
    }
    m_logFile.open(filename, std::ios::app);
    if (!m_logFile.is_open()) {
        std::cerr << "Failed to open log file: " << filename << std::endl;
    } else {
        LOG_INFO("Log file set to {}", filename);
    }
}

std::string Logger::logLevelToString(LogLevel level) const {
    switch (level) {
        case DEBUG: return "DEBUG";
        case INFO:  return "INFO";
        case WARN:  return "WARN";
        case ERROR: return "ERROR";
        case FATAL: return "FATAL";
        default:    return "UNKNOWN";
    }
}

std::string Logger::getTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
    auto timer = std::chrono::system_clock::to_time_t(now);
    std::tm bt = *std::localtime(&timer); // Use std::localtime_s or gmtime_s for thread safety if available

    std::ostringstream oss;
    oss << std::put_time(&bt, "%Y-%m-%d %H:%M:%S");
    oss << '.' << std::setfill('0') << std::setw(3) << ms.count();
    return oss.str();
}

} // namespace VisGenius
```