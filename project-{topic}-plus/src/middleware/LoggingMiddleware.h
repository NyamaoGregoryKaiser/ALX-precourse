#ifndef LOGGING_MIDDLEWARE_H
#define LOGGING_MIDDLEWARE_H

#include <crow.h>
#include "../logger/Logger.h"

struct LoggingMiddleware {
    void before_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx);
    void after_handle(crow::request& req, crow::response& res, crow::details::Context<void>& ctx);
};

#endif // LOGGING_MIDDLEWARE_H