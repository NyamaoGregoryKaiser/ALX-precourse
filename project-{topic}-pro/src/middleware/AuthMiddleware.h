```cpp
#ifndef AURORA_METRICS_AUTHMIDDLEWARE_H
#define AURORA_METRICS_AUTHMIDDLEWARE_H

#include "crow.h"
#include "../utils/JWTManager.h"
#include "../utils/Logger.h"
#include <memory>

// Define a custom request context to store user info after authentication
struct AuthContext : crow::ILogHandler {
    AuthContext() = default;

    // From ILogHandler
    void log(std::string message, crow::LogLevel level) override {
        // Implement logging for Crow internal messages if needed
        // For now, delegate to our main logger
        switch(level) {
            case crow::LogLevel::DEBUG: Logger::debug("CROW: {}", message); break;
            case crow::LogLevel::INFO: Logger::info("CROW: {}", message); break;
            case crow::LogLevel::WARNING: Logger::warn("CROW: {}", message); break;
            case crow::LogLevel::ERROR: Logger::error("CROW: {}", message); break;
            case crow::LogLevel::CRITICAL: Logger::critical("CROW: {}", message); break;
        }
    }

    std::string username;
    bool is_authenticated = false;
};

class AuthMiddleware : public crow::IMiddleware {
public:
    std::string get_name() override {
        return "AuthMiddleware";
    }

    // This method is called by Crow to create a new context for each request
    void before_handle(crow::request& req, crow::response& res, AuthContext& ctx);
    void after_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    void set_jwt_manager(std::shared_ptr<JWTManager> manager) {
        jwt_manager = std::move(manager);
    }

private:
    std::shared_ptr<JWTManager> jwt_manager;
};

#endif // AURORA_METRICS_AUTHMIDDLEWARE_H
```