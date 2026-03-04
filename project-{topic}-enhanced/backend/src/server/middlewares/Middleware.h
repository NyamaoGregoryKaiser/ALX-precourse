#pragma once

#include "server/HttpServer.h"

// Base class for all middlewares
class Middleware {
public:
    virtual ~Middleware() = default;
    // Returns a response if the request should be short-circuited,
    // otherwise a special 'continue' status indicating processing should continue.
    virtual HttpResponse handle(HttpRequest& request) = 0;
};