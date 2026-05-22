```cpp
#pragma once

#include "pistache/http.h"
#include "pistache/endpoint.h"
#include "pistache/router.h"

// Re-include HttpError from AuthMiddleware.h to make it universally available
#include "middleware/AuthMiddleware.h"

class ErrorHandlingMiddleware {
public:
    // Handles specific HttpError exceptions
    static void handle(Pistache::Http::ResponseWriter& response, const HttpError& error);

    // Handles general std::exceptions (catch-all)
    static void handle(Pistache::Http::ResponseWriter& response, const std::exception& ex);

    // Handles situations where no route matches (404 Not Found)
    static void handleNotFound(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
};
```