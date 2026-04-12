#pragma once

#include <pistache/net.h>
#include <pistache/http.h>
#include <pistache/router.h>
#include <pistache/endpoint.h>

#include "src/config/config.h"
#include "src/utils/logger.h"
#include "src/middleware/error_handler.h"
#include "src/middleware/rate_limiter.h"
#include "src/auth/jwt_middleware.h"
#include "src/auth/auth_service.h"
#include "src/controllers/auth_controller.h"
#include "src/controllers/task_controller.h"

class HttpRestServer {
public:
    explicit HttpRestServer(Pistache::Address addr);
    ~HttpRestServer();

    void init(size_t thr = 2);
    void start();
    void shutdown();

private:
    std::shared_ptr<Pistache::Http::Endpoint> http_endpoint_;
    Pistache::Rest::Router router_;

    AuthService auth_service_;
    ErrorHandler error_handler_;
    RateLimiter rate_limiter_;
    JwtMiddleware jwt_middleware_;

    AuthController auth_controller_;
    TaskController task_controller_;

    // Set up routes and middleware
    void setup_routes();
};
```