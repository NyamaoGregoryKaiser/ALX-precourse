```cpp
#ifndef MLTOOLKIT_EXCEPTIONS_HPP
#define MLTOOLKIT_EXCEPTIONS_HPP

#include <stdexcept>
#include <string>
#include <utility> // For std::move

namespace MLToolkit {
namespace Common {

// Base exception for MLToolkit
class MLToolkitException : public std::runtime_error {
public:
    explicit MLToolkitException(std::string message)
        : std::runtime_error(std::move(message)) {}
};

// Database related exceptions
class DatabaseException : public MLToolkitException {
public:
    explicit DatabaseException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// Invalid input/argument exceptions
class InvalidArgumentException : public MLToolkitException {
public:
    explicit InvalidArgumentException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// Resource not found exceptions
class NotFoundException : public MLToolkitException {
public:
    explicit NotFoundException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// Authentication/Authorization exceptions
class AuthException : public MLToolkitException {
public:
    explicit AuthException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// Configuration exceptions
class ConfigException : public MLToolkitException {
public:
    explicit ConfigException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// ML Utility specific exceptions
class MLUtilityException : public MLToolkitException {
public:
    explicit MLUtilityException(std::string message)
        : MLToolkitException(std::move(message)) {}
};

// Generic API error
class ApiException : public MLToolkitException {
public:
    explicit ApiException(std::string message, int status_code = 500)
        : MLToolkitException(std::move(message)), status_code_(status_code) {}

    int get_status_code() const { return status_code_; }

private:
    int status_code_;
};

} // namespace Common
} // namespace MLToolkit

#endif // MLTOOLKIT_EXCEPTIONS_HPP
```