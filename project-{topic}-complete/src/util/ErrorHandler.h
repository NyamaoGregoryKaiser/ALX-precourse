```cpp
#ifndef VISUFLOW_ERROR_HANDLER_H
#define VISUFLOW_ERROR_HANDLER_H

#include "Logger.h"

#include <string>
#include <stdexcept>
#include <nlohmann/json.hpp>

// Forward declarations for mock HTTP types
namespace Http {
    namespace Rest {
        using Response = std::string; // Simplified mock response type
    }
}

namespace VisuFlow {
namespace Util {

/**
 * @brief Custom exception class for API-specific errors.
 */
class APIException : public std::runtime_error {
public:
    APIException(const std::string& message, int statusCode = 500)
        : std::runtime_error(message), m_statusCode(statusCode) {}

    int statusCode() const { return m_statusCode; }

private:
    int m_statusCode;
};

/**
 * @brief Provides centralized error handling utilities for the API.
 */
class ErrorHandler {
public:
    // Delete copy/move constructors and assignment operators for static class
    ErrorHandler() = delete;
    ErrorHandler(const ErrorHandler&) = delete;
    ErrorHandler& operator=(const ErrorHandler&) = delete;

    /**
     * @brief Handles an APIException, setting the appropriate HTTP response.
     * @param ex The APIException caught.
     * @param res The HTTP response object to modify.
     */
    static void handleAPIException(const APIException& ex, Http::Rest::Response& res);

    /**
     * @brief Handles a generic standard exception, setting a 500 HTTP response.
     * @param ex The standard exception caught.
     * @param res The HTTP response object to modify.
     */
    static void handleGenericError(const std::exception& ex, Http::Rest::Response& res);

    /**
     * @brief Handles unknown exceptions (catch-all), setting a 500 HTTP response.
     * @param res The HTTP response object to modify.
     */
    static void handleUnknownError(Http::Rest::Response& res);

private:
    /**
     * @brief Helper to format an error response as JSON.
     * @param message The error message.
     * @param statusCode The HTTP status code.
     * @return A JSON string representing the error.
     */
    static std::string formatErrorResponse(const std::string& message, int statusCode);
};

} // namespace Util
} // namespace VisuFlow

#endif // VISUFLOW_ERROR_HANDLER_H
```