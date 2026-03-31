#pragma once

#include <drogon/HttpFilter.h>
#include <drogon/HttpResponse.h>
#include <json/json.h>

// Custom exception types for structured error handling
struct ApiError : public std::runtime_error {
    int statusCode;
    std::string errorCode; // A unique code for this error type

    ApiError(int status, const std::string& code, const std::string& message)
        : std::runtime_error(message), statusCode(status), errorCode(code) {}

    Json::Value toJson() const {
        Json::Value error;
        error["code"] = statusCode;
        error["errorCode"] = errorCode;
        error["message"] = what();
        return error;
    }
};

// Specific error types
struct NotFoundError : public ApiError {
    NotFoundError(const std::string& message = "Resource not found")
        : ApiError(404, "NOT_FOUND", message) {}
};

struct BadRequestError : public ApiError {
    BadRequestError(const std::string& message = "Bad request")
        : ApiError(400, "BAD_REQUEST", message) {}
};

struct UnauthorizedError : public ApiError {
    UnauthorizedError(const std::string& message = "Authentication required")
        : ApiError(401, "UNAUTHORIZED", message) {}
};

struct ForbiddenError : public ApiError {
    ForbiddenError(const std::string& message = "Access forbidden")
        : ApiError(403, "FORBIDDEN", message) {}
};

struct ConflictError : public ApiError {
    ConflictError(const std::string& message = "Resource conflict")
        : ApiError(409, "CONFLICT", message) {}
};

struct InternalServerError : public ApiError {
    InternalServerError(const std::string& message = "Internal server error")
        : ApiError(500, "INTERNAL_SERVER_ERROR", message) {}
};


// Drogon filter to catch exceptions and format responses
class ErrorHandler : public drogon::HttpFilter<ErrorHandler> {
public:
    ErrorHandler() = default;

    void doFilter(const drogon::HttpRequestPtr &req,
                  drogon::FilterCallback &&fcb,
                  drogon::FilterChainCallback &&fccb) override;
};