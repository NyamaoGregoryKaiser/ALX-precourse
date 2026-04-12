#pragma once

#include <stdexcept>
#include <string>

// Base custom exception for the API.
// Allows for a custom status code to be associated with the exception.
class ApiException : public std::runtime_error {
public:
    explicit ApiException(const std::string& message, int status_code = 500)
        : std::runtime_error(message), status_code_(status_code) {}

    int getStatusCode() const {
        return status_code_;
    }

private:
    int status_code_;
};

// Specific HTTP-like exceptions
class BadRequestException : public ApiException {
public:
    explicit BadRequestException(const std::string& message = "Bad Request")
        : ApiException(message, 400) {}
};

class UnauthorizedException : public ApiException {
public:
    explicit UnauthorizedException(const std::string& message = "Unauthorized")
        : ApiException(message, 401) {}
};

class ForbiddenException : public ApiException {
public:
    explicit ForbiddenException(const std::string& message = "Forbidden")
        : ApiException(message, 403) {}
};

class NotFoundException : public ApiException {
public:
    explicit NotFoundException(const std::string& message = "Not Found")
        : ApiException(message, 404) {}
};

class ConflictException : public ApiException {
public:
    explicit ConflictException(const std::string& message = "Conflict")
        : ApiException(message, 409) {}
};

class InternalServerException : public ApiException {
public:
    explicit InternalServerException(const std::string& message = "Internal Server Error")
        : ApiException(message, 500) {}
};

// Database specific exceptions
class DatabaseException : public ApiException {
public:
    explicit DatabaseException(const std::string& message = "Database Error")
        : ApiException(message, 500) {}
};
```