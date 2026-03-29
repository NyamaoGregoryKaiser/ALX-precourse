```cpp
#ifndef DATAVIZ_LOGGINGMIDDLEWARE_H
#define DATAVIZ_LOGGINGMIDDLEWARE_H

#include <crow.h>
#include "../../utils/Logger.h"

class LoggingMiddleware {
public:
    struct context {}; // No specific context needed for this middleware

    void before_handle(crow::request& req, crow::response& res, context& ctx);
    void after_handle(crow::request& req, crow::response& res, context& ctx);
};

#endif // DATAVIZ_LOGGINGMIDDLEWARE_H
```