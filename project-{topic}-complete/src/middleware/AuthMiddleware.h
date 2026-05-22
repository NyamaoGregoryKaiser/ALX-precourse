```cpp
#pragma once

#include "pistache/http.h"
#include "pistache/endpoint.h"
#include "pistache/router.h" // For custom HttpError

#include <string>
#include <optional>

// Forward declare for current user context
struct CurrentUser {
    long id;
    std::string username;
};

// Custom exception for HTTP errors
class HttpError : public std::runtime_error {
public:
    Pistache::Http::Code statusCode;
    explicit HttpError(Pistache::Http::Code code, const std::string& message)
        : std::runtime_error(message), statusCode(code) {}
};


class AuthMiddleware {
public:
    void handle(const Pistache::Rest::Request& request);

    // Helper to get the authenticated user from the request (after middleware has run)
    // This is a simple way to pass user context. In a real app, you might
    // use thread-local storage or a more robust context object for the request lifecycle.
    static std::optional<CurrentUser> getCurrentUser(const Pistache::Rest::Request& request);
    static void setCurrentUser(Pistache::Rest::Request& request, CurrentUser user);

private:
    static const std::string CONTEXT_USER_KEY;
};
```