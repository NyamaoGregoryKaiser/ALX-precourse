```cpp
#ifndef WEBSCRAPER_ERROR_HANDLER_H
#define WEBSCRAPER_ERROR_HANDLER_H

#include "logger.h"
#include "http_status.h"
#include <string>
#include <stdexcept>
#include <nlohmann/json.hpp>

// Base custom exception for the application
class AppException : public std::runtime_error {
public:
    AppException(const std::string& message, Http::Code statusCode = Http::Code::Internal_Server_Error)
        : std::runtime_error(message), statusCode(statusCode) {
        Logger::error("AppException", "Error: {} (Status: {})", message, static_cast<int>(statusCode));
    }

    Http::Code getStatusCode() const {
        return statusCode;
    }

    virtual nlohmann::json toJson() const {
        nlohmann::json err_json;
        err_json["error"] = what();
        err_json["status_code"] = static_cast<int>(statusCode);
        return err_json;
    }

protected:
    Http::Code statusCode;
};

// Specific exceptions
class NotFoundException : public AppException {
public:
    NotFoundException(const std::string& resourceName = "Resource")
        : AppException(resourceName + " not found", Http::Code::Not_Found) {}
};

class BadRequestException : public AppException {
public:
    BadRequestException(const std::string& message = "Bad request")
        : AppException(message, Http::Code::Bad_Request) {}
};

class UnauthorizedException : public AppException {
public:
    UnauthorizedException(const std::string& message = "Unauthorized")
        : AppException(message, Http::Code::Unauthorized) {}
};

class ForbiddenException : public AppException {
public:
    ForbiddenException(const std::string& message = "Forbidden")
        : AppException(message, Http::Code::Forbidden) {}
};

class DatabaseException : public AppException {
public:
    DatabaseException(const std::string& message = "Database error")
        : AppException(message, Http::Code::Internal_Server_Error) {}
};

class ConflictException : public AppException {
public:
    ConflictException(const std::string& message = "Conflict")
        : AppException(message, Http::Code::Conflict) {}
};

class ServiceUnavailableException : public AppException {
public:
    ServiceUnavailableException(const std::string& message = "Service unavailable")
        : AppException(message, Http::Code::Service_Unavailable) {}
};

#endif // WEBSCRAPER_ERROR_HANDLER_H
```