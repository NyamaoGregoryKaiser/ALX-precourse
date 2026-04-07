```cpp
#ifndef WEBSCRAPER_LOGGER_H
#define WEBSCRAPER_LOGGER_H

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <memory>
#include <string>

class Logger {
public:
    static void init();
    static std::shared_ptr<spdlog::logger>& get();

    // Convenience wrappers
    template<typename... Args>
    static void debug(const std::string& tag, const std::string& msg, Args&&... args) {
        get()->debug("[{}] " + msg, tag, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void info(const std::string& tag, const std::string& msg, Args&&... args) {
        get()->info("[{}] " + msg, tag, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void warn(const std::string& tag, const std::string& msg, Args&&... args) {
        get()->warn("[{}] " + msg, tag, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void error(const std::string& tag, const std::string& msg, Args&&... args) {
        get()->error("[{}] " + msg, tag, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void critical(const std::string& tag, const std::string& msg, Args&&... args) {
        get()->critical("[{}] " + msg, tag, std::forward<Args>(args)...);
    }

private:
    Logger() = delete; // Static class
    static std::shared_ptr<spdlog::logger> instance;
};

#endif // WEBSCRAPER_LOGGER_H
```