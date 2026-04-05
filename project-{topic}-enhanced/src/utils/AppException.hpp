```cpp
#ifndef APP_EXCEPTION_HPP
#define APP_EXCEPTION_HPP

#include <stdexcept>
#include <string>
#include "crow.h" // For crow::status enum

// Base custom exception class for the application.
class AppException : public std::runtime_error {
public:
    AppException(const std::string& message, crow::status statusCode, const std::string& details = "")
        : std::runtime_error(message), statusCode(static_cast<int>(statusCode)), details(details) {}
    
    // Allows constructing with integer status code if crow.h is not included directly
    AppException(const std::string& message, int statusCode, const std::string& details = "")
        : std::runtime_error(message), statusCode(statusCode), details(details) {}

    int getStatusCode() const { return statusCode; }
    const std::string& getDetails() const { return details; }

protected:
    int statusCode;
    std::string details;
};

// Specific exception for Bad Request (HTTP 400)
class BadRequestException : public AppException {
public:
    explicit BadRequestException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::BAD_REQUEST, details) {}
};

// Specific exception for Unauthorized (HTTP 401)
class UnauthorizedException : public AppException {
public:
    explicit UnauthorizedException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::UNAUTHORIZED, details) {}
};

// Specific exception for Forbidden (HTTP 403)
class ForbiddenException : public AppException {
public:
    explicit ForbiddenException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::FORBIDDEN, details) {}
};

// Specific exception for Not Found (HTTP 404)
class NotFoundException : public AppException {
public:
    explicit NotFoundException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::NOT_FOUND, details) {}
};

// Specific exception for Conflict (HTTP 409)
class ConflictException : public AppException {
public:
    explicit ConflictException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::CONFLICT, details) {}
};

// Specific exception for Too Many Requests (HTTP 429)
class TooManyRequestsException : public AppException {
public:
    explicit TooManyRequestsException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::TOO_MANY_REQUESTS, details) {}
};

// Specific exception for Internal Server Error (HTTP 500)
class InternalServerErrorException : public AppException {
public:
    explicit InternalServerErrorException(const std::string& message, const std::string& details = "")
        : AppException(message, crow::status::INTERNAL_SERVER_ERROR, details) {}
};

#endif // APP_EXCEPTION_HPP
```