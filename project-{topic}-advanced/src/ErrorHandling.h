```cpp
#ifndef VISGENIUS_ERROR_HANDLING_H
#define VISGENIUS_ERROR_HANDLING_H

#include <stdexcept>
#include <string>

namespace VisGenius {

enum class ErrorCode {
    UNKNOWN = 0,
    DB_ERROR,
    NOT_FOUND,
    INVALID_INPUT,
    UNAUTHORIZED,
    FORBIDDEN,
    SERVER_ERROR,
    DATA_PROCESSING_ERROR,
    // Add more specific error codes as needed
};

class VisGeniusException : public std::runtime_error {
public:
    explicit VisGeniusException(ErrorCode code, const std::string& message)
        : std::runtime_error(message), m_errorCode(code) {}

    ErrorCode getErrorCode() const noexcept {
        return m_errorCode;
    }

    std::string getErrorCodeString() const {
        switch (m_errorCode) {
            case ErrorCode::UNKNOWN: return "UNKNOWN";
            case ErrorCode::DB_ERROR: return "DB_ERROR";
            case ErrorCode::NOT_FOUND: return "NOT_FOUND";
            case ErrorCode::INVALID_INPUT: return "INVALID_INPUT";
            case ErrorCode::UNAUTHORIZED: return "UNAUTHORIZED";
            case ErrorCode::FORBIDDEN: return "FORBIDDEN";
            case ErrorCode::SERVER_ERROR: return "SERVER_ERROR";
            case ErrorCode::DATA_PROCESSING_ERROR: return "DATA_PROCESSING_ERROR";
            default: return "UNDEFINED_ERROR_CODE";
        }
    }

protected:
    ErrorCode m_errorCode;
};

// Specific exception types for convenience
class DbException : public VisGeniusException {
public:
    explicit DbException(const std::string& message)
        : VisGeniusException(ErrorCode::DB_ERROR, "Database Error: " + message) {}
};

class NotFoundException : public VisGeniusException {
public:
    explicit NotFoundException(const std::string& message)
        : VisGeniusException(ErrorCode::NOT_FOUND, "Resource Not Found: " + message) {}
};

class InvalidInputException : public VisGeniusException {
public:
    explicit InvalidInputException(const std::string& message)
        : VisGeniusException(ErrorCode::INVALID_INPUT, "Invalid Input: " + message) {}
};

class UnauthorizedException : public VisGeniusException {
public:
    explicit UnauthorizedException(const std::string& message = "Authentication Required")
        : VisGeniusException(ErrorCode::UNAUTHORIZED, "Unauthorized: " + message) {}
};

class ForbiddenException : public VisGeniusException {
public:
    explicit ForbiddenException(const std::string& message = "Access Denied")
        : VisGeniusException(ErrorCode::FORBIDDEN, "Forbidden: " + message) {}
};

class DataProcessingException : public VisGeniusException {
public:
    explicit DataProcessingException(const std::string& message)
        : VisGeniusException(ErrorCode::DATA_PROCESSING_ERROR, "Data Processing Error: " + message) {}
};

} // namespace VisGenius

#endif // VISGENIUS_ERROR_HANDLING_H
```