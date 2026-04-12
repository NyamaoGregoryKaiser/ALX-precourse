#pragma once

#include <pistache/http.h>
#include <pistache/router.h>
#include <json/json.h>

#include "src/utils/logger.h"
#include "src/utils/exceptions.h"
#include "src/utils/json_util.h"

// Error handling middleware class
class ErrorHandler {
public:
    ErrorHandler();

    // Middleware function to catch exceptions and send JSON error responses
    void handle(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next);

private:
    // Helper to send a JSON error response
    void send_error_response(Pistache::Http::ResponseWriter& response, int status_code, const std::string& message);
};
```