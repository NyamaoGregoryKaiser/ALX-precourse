```cpp
#ifndef APP_ERRORS_H
#define APP_ERRORS_H

#include <stdexcept>
#include <string>

namespace TaskManager {

/**
 * @brief Base exception for all application-specific errors.
 */
class AppException : public std::runtime_error {
public:
    explicit AppException(const std::string& message)
        : std::runtime_error(message) {}
};

/**
 * @brief Exception thrown when a requested resource is not found. (HTTP 404)
 */
class NotFoundException : public AppException {
public:
    explicit NotFoundException(const std::string& message = "Resource not found.")
        : AppException(message) {}
};

/**
 * @brief Exception thrown when a user is not authenticated or authorized. (HTTP 401/403)
 */
class AuthException : public AppException {
public:
    explicit AuthException(const std::string& message = "Authentication or authorization failed.")
        : AppException(message) {}
};

/**
 * @brief Exception thrown for invalid input data. (HTTP 400)
 */
class ValidationException : public AppException {
public:
    explicit ValidationException(const std::string& message = "Invalid input data.")
        : AppException(message) {}
};

/**
 * @brief Exception thrown when there is a conflict, e.g., duplicate resource. (HTTP 409)
 */
class ConflictException : public AppException {
public:
    explicit ConflictException(const std::string& message = "Resource conflict.")
        : AppException(message) {}
};

/**
 * @brief Exception thrown for internal server errors. (HTTP 500)
 */
class InternalServerException : public AppException {
public:
    explicit InternalServerException(const std::string& message = "Internal server error.")
        : AppException(message) {}
};

/**
 * @brief Exception thrown for rate limiting. (HTTP 429)
 */
class TooManyRequestsException : public AppException {
public:
    explicit TooManyRequestsException(const std::string& message = "Too many requests. Please try again later.")
        : AppException(message) {}
};

// Add more specific exceptions as needed, e.g.,
// class PermissionDeniedException : public AuthException {};

} // namespace TaskManager

#endif // APP_ERRORS_H
```