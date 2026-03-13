#ifndef CMS_ERROR_HPP
#define CMS_ERROR_HPP

#include <stdexcept>
#include <string>
#include <pistache/http.h> // For Http::Code

namespace cms::common {

// Base exception for API errors
class ApiException : public std::runtime_error {
public:
    explicit ApiException(Pistache::Http::Code code, const std::string& message)
        : std::runtime_error(message), http_code_(code) {}

    Pistache::Http::Code http_code() const {
        return http_code_;
    }

protected:
    Pistache::Http::Code http_code_;
};

// Specific API Exception types
class NotFoundException : public ApiException {
public:
    explicit NotFoundException(const std::string& message = "Resource not found")
        : ApiException(Pistache::Http::Code::Not_Found, message) {}
};

class BadRequestException : public ApiException {
public:
    explicit BadRequestException(const std::string& message = "Bad request")
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

class ConflictException : public ApiException {
public:
    explicit ConflictException(const std::string& message = "Conflict")
        : ApiException(Pistache::Http::Code::Conflict, message) {}
};

class InternalServerError : public ApiException {
public:
    explicit InternalServerError(const std::string& message = "Internal server error")
        : ApiException(Pistache::Http::Code::Internal_Server_Error, message) {}
};

} // namespace cms::common

#endif // CMS_ERROR_HPP
```