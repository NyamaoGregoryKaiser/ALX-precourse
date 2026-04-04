#pragma once

#include <string>
#include <stdexcept>
#include <json/json.h>

namespace tm_api {
namespace utils {

class AppException : public std::runtime_error {
public:
    AppException(const std::string& type, const std::string& message, int httpStatus)
        : std::runtime_error(message), type(type), httpStatus(httpStatus) {}

    std::string getType() const { return type; }
    int getHttpStatus() const { return httpStatus; }

    std::string toJsonError() const {
        Json::Value error;
        error["error"] = type;
        error["message"] = what();
        error["status"] = httpStatus;
        return error.toStyledString();
    }

private:
    std::string type;
    int httpStatus;
};

class BadRequestException : public AppException {
public:
    explicit BadRequestException(const std::string& message = "Bad Request")
        : AppException("BadRequest", message, 400) {}
};

class UnauthorizedException : public AppException {
public:
    explicit UnauthorizedException(const std::string& message = "Unauthorized")
        : AppException("Unauthorized", message, 401) {}
};

class ForbiddenException : public AppException {
public:
    explicit ForbiddenException(const std::string& message = "Forbidden")
        : AppException("Forbidden", message, 403) {}
};

class NotFoundException : public AppException {
public:
    explicit NotFoundException(const std::string& message = "Resource Not Found")
        : AppException("NotFound", message, 404) {}
};

class ConflictException : public AppException {
public:
    explicit ConflictException(const std::string& message = "Resource Conflict")
        : AppException("Conflict", message, 409) {}
};

// Utility to create a generic JSON error response
class ErrorHandler {
public:
    static std::string toJsonError(const std::string& type, const std::string& message, int httpStatus) {
        Json::Value error;
        error["error"] = type;
        error["message"] = message;
        error["status"] = httpStatus;
        return error.toStyledString();
    }
};

} // namespace utils
} // namespace tm_api