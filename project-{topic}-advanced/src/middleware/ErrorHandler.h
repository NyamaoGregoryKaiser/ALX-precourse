#ifndef ERROR_HANDLER_H
#define ERROR_HANDLER_H

#include <drogon/HttpAppFramework.h>
#include <drogon/HttpResponse.h>
#include <json/json.h>

namespace ErrorHandler {

    /**
     * @brief Custom error handler function for Drogon.
     *        This function is registered with the HttpAppFramework to catch
     *        unhandled exceptions or return specific error pages/responses.
     * @param statusCode The HTTP status code.
     * @param matchedPath The path that was matched.
     * @return An HttpResponsePtr to send to the client.
     */
    drogon::HttpResponsePtr customErrorHandler(
        drogon::HttpStatusCode statusCode,
        const std::string& matchedPath
    );

} // namespace ErrorHandler

#endif // ERROR_HANDLER_H
```