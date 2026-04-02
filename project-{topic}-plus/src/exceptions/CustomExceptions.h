```cpp
#ifndef CUSTOM_EXCEPTIONS_H
#define CUSTOM_EXCEPTIONS_H

#include <stdexcept>
#include <string>

namespace TaskManager {
namespace Exceptions {

enum class ErrorCode {
    UNKNOWN_ERROR = 0,
    NOT_FOUND = 404,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
    DATABASE_ERROR = 5000,
    VALIDATION_ERROR = 4000
};

class BaseException : public std::runtime_error {
public:
    BaseException(ErrorCode code, const std::string& message)
        : std::runtime_error(message), code_(code) {}

    ErrorCode getErrorCode() const { return code_; }

protected:
    ErrorCode code_;
};

class NotFoundException : public BaseException {
public:
    explicit NotFoundException(const std::string& message = "Resource not found.")
        : BaseException(ErrorCode::NOT_FOUND, message) {}
};

class BadRequestException : public BaseException {
public:
    explicit BadRequestException(const std::string& message = "Invalid request payload or parameters.")
        : BaseException(ErrorCode::BAD_REQUEST, message) {}
};

class UnauthorizedException : public BaseException {
public:
    explicit UnauthorizedException(const std::string& message = "Authentication required.")
        : BaseException(ErrorCode::UNAUTHORIZED, message) {}
};

class ForbiddenException : public BaseException {
public:
    explicit ForbiddenException(const std::string& message = "Access to resource forbidden.")
        : BaseException(ErrorCode::FORBIDDEN, message) {}
};

class ConflictException : public BaseException {
public:
    explicit ConflictException(const std::string& message = "Resource already exists or conflicts with existing data.")
        : BaseException(ErrorCode::CONFLICT, message) {}
};

class InternalServerError : public BaseException {
public:
    explicit InternalServerError(const std::string& message = "An unexpected internal server error occurred.")
        : BaseException(ErrorCode::INTERNAL_SERVER_ERROR, message) {}
};

class DatabaseException : public BaseException {
public:
    explicit DatabaseException(const std::string& message = "A database operation failed.")
        : BaseException(ErrorCode::DATABASE_ERROR, message) {}
};

class ValidationException : public BaseException {
public:
    explicit ValidationException(const std::string& message = "Data validation failed.")
        : BaseException(ErrorCode::VALIDATION_ERROR, message) {}
};

} // namespace Exceptions
} // namespace TaskManager

#endif // CUSTOM_EXCEPTIONS_H
```