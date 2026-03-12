```cpp
#ifndef PAYMENT_PROCESSOR_API_EXCEPTION_HPP
#define PAYMENT_PROCESSOR_API_EXCEPTION_HPP

#include <stdexcept>
#include <string>
#include <Pistache/Http.h> // For Http::Code

class ApiException : public std::runtime_error {
public:
    explicit ApiException(Pistache::Http::Code statusCode, const std::string& message)
        : std::runtime_error(message), statusCode_(statusCode) {}

    Pistache::Http::Code getStatusCode() const { return statusCode_; }

private:
    Pistache::Http::Code statusCode_;
};

// Specific derived exceptions for common HTTP error codes
class BadRequestException : public ApiException {
public:
    explicit BadRequestException(const std::string& message = "Bad Request")
        : ApiException(Pistache::Http::Code::Bad_Request, message) {}
};

class UnauthorizedException : public ApiException {
public:
    explicit UnauthorizedException(const std::string& message = "Unauthorized")
        : ApiException(Pistache::Http::Code::Unauthorized, message) {}
};

class ForbiddenException : public ApiException {
public:
    explicit ForbiddenException(const std::string& message = "Forbidden")
        : ApiException(Pistache::Http::Code::Forbidden, message) {}
};

class NotFoundException : public ApiException {
public:
    explicit NotFoundException(const std::string& message = "Not Found")
        : ApiException(Pistache::Http::Code::Not_Found, message) {}
};

class ConflictException : public ApiException {
public:
    explicit ConflictException(const std::string& message = "Conflict")
        : ApiException(Pistache::Http::Code::Conflict, message) {}
};

class InternalServerErrorException : public ApiException {
public:
    explicit InternalServerErrorException(const std::string& message = "Internal Server Error")
        : ApiException(Pistache::Http::Code::Internal_Server_Error, message) {}
};


#endif // PAYMENT_PROCESSOR_API_EXCEPTION_HPP
```