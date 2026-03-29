```cpp
#ifndef CUSTOM_EXCEPTIONS_HPP
#define CUSTOM_EXCEPTIONS_HPP

#include <stdexcept>
#include <string>

// Base custom exception class
class CustomException : public std::runtime_error {
public:
    CustomException(const std::string& message, int status_code = 500, const std::string& details = "")
        : std::runtime_error(message), status_code_(status_code), details_(details) {}

    int getStatusCode() const { return status_code_; }
    std::string getDetails() const { return details_; }

protected:
    int status_code_;
    std::string details_;
};

// --- Specific API Exceptions ---

// 400 Bad Request
class BadRequestException : public CustomException {
public:
    BadRequestException(const std::string& message = "Bad Request", const std::string& details = "")
        : CustomException(message, 400, details) {}
};

// 401 Unauthorized
class UnauthorizedException : public CustomException {
public:
    UnauthorizedException(const std::string& message = "Unauthorized", const std::string& details = "")
        : CustomException(message, 401, details) {}
};

// 403 Forbidden
class ForbiddenException : public CustomException {
public:
    ForbiddenException(const std::string& message = "Forbidden", const std::string& details = "")
        : CustomException(message, 403, details) {}
};

// 404 Not Found
class NotFoundException : public CustomException {
public:
    NotFoundException(const std::string& message = "Not Found", const std::string& details = "")
        : CustomException(message, 404, details) {}
};

// 409 Conflict (e.g., resource already exists)
class ConflictException : public CustomException {
public:
    ConflictException(const std::string& message = "Conflict", const std::string& details = "")
        : CustomException(message, 409, details) {}
};

// 429 Too Many Requests
class TooManyRequestsException : public CustomException {
public:
    TooManyRequestsException(const std::string& message = "Too Many Requests", const std::string& details = "")
        : CustomException(message, 429, details) {}
};

// --- Application Specific Exceptions ---

// Database related exceptions
class DatabaseException : public CustomException {
public:
    DatabaseException(const std::string& message = "Database Error", const std::string& details = "")
        : CustomException(message, 500, details) {}
};

// Service layer general exceptions
class ServiceException : public CustomException {
public:
    ServiceException(const std::string& message = "Service Error", const std::string& details = "")
        : CustomException(message, 500, details) {}
};

#endif // CUSTOM_EXCEPTIONS_HPP
```