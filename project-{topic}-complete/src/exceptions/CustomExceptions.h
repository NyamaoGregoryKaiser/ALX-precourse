```cpp
#ifndef CUSTOM_EXCEPTIONS_H
#define CUSTOM_EXCEPTIONS_H

#include <stdexcept>
#include <string>

namespace PaymentProcessor {
namespace Exceptions {

class PaymentProcessorException : public std::runtime_error {
public:
    explicit PaymentProcessorException(const std::string& message)
        : std::runtime_error("PaymentProcessorException: " + message) {}
};

class NotFoundException : public PaymentProcessorException {
public:
    explicit NotFoundException(const std::string& message)
        : PaymentProcessorException("Not Found: " + message) {}
};

class InvalidArgumentException : public PaymentProcessorException {
public:
    explicit InvalidArgumentException(const std::string& message)
        : PaymentProcessorException("Invalid Argument: " + message) {}
};

class UnauthorizedException : public PaymentProcessorException {
public:
    explicit UnauthorizedException(const std::string& message = "Authentication required or invalid credentials")
        : PaymentProcessorException("Unauthorized: " + message) {}
};

class ForbiddenException : public PaymentProcessorException {
public:
    explicit ForbiddenException(const std::string& message = "Access to resource forbidden")
        : PaymentProcessorException("Forbidden: " + message) {}
};

class DatabaseException : public PaymentProcessorException {
public:
    explicit DatabaseException(const std::string& message)
        : PaymentProcessorException("Database Error: " + message) {}
};

class ValidationException : public PaymentProcessorException {
public:
    explicit ValidationException(const std::string& message)
        : PaymentProcessorException("Validation Error: " + message) {}
};

// Add more specific exceptions as needed, e.g., InsufficientFundsException, TransactionFailedException

} // namespace Exceptions
} // namespace PaymentProcessor

#endif // CUSTOM_EXCEPTIONS_H
```