```cpp
#ifndef ERROR_HANDLER_HPP
#define ERROR_HANDLER_HPP

#include "crow.h" // For crow::response, crow::json::wvalue
#include "json.hpp" // For nlohmann::json
#include "Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include <string>
#include <stdexcept>
#include <functional> // For std::function

// A utility function to convert custom exceptions into Crow responses
crow::response handle_exception(const CustomException& e);
crow::response handle_exception(const std::exception& e); // Generic exception handler
crow::response handle_unknown_exception(); // Fallback for truly unknown exceptions

// A generic wrapper function for controller logic to catch common exceptions
template<typename Func>
auto try_catch_handler(Func&& func) {
    try {
        return func();
    } catch (const CustomException& e) {
        Logger::log(LogLevel::ERROR, "API Error: " + std::string(e.what()));
        return handle_exception(e);
    } catch (const std::exception& e) {
        Logger::log(LogLevel::CRITICAL, "Unhandled standard exception in API: " + std::string(e.what()));
        return handle_exception(e);
    } catch (...) {
        Logger::log(LogLevel::CRITICAL, "Unknown unhandled exception in API endpoint.");
        return handle_unknown_exception();
    }
}

#endif // ERROR_HANDLER_HPP
```