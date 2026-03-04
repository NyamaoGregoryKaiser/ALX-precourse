#pragma once

#include "Middleware.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp"

class ErrorHandler : public Middleware {
public:
    ErrorHandler() = default;

    HttpResponse handle(HttpRequest& request) override {
        // This middleware is usually placed at the start of the chain
        // so subsequent handlers can throw exceptions that it can catch.
        // It should not be throwing itself, but handling others' exceptions.
        // In a C++ server, you'd typically wrap the *next* handler call in a try-catch.
        // For Boost.Beast, this would mean modifying the Session::on_read or Router::handleRequest
        // to call `handle` method of an actual RequestHandler inside try/catch.
        // For a conceptual middleware, we can illustrate by 'passing through' and assuming a global catch.
        
        // This 'continue_status' means it just passes through,
        // and a global exception handler in Router::handleRequest or HttpServer::Session::on_read
        // would catch exceptions thrown by actual request handlers.
        return HttpResponse(http::status::continue_status); 
    }
};
// Example of how ErrorHandler would *actually* be used by the Router (inside Router::handleRequest)
// for (const auto& middleware : global_middlewares_) {
//     try {
//         HttpResponse middleware_res = middleware->handle(req);
//         if (middleware_res.status != http::status::continue_status) {
//             return middleware_res; // Middleware short-circuited the request
//         }
//     } catch (const std::exception& e) {
//         Logger::error("Global Middleware Error: " + std::string(e.what()));
//         // This is where ErrorHandler would format the response
//         return HttpResponse(http::status::internal_server_error,
//                             nlohmann::json({{"error", "Internal Server Error", "details", e.what()}}).dump());
//     }
// }
// This is already integrated into the `Router.cpp` provided.