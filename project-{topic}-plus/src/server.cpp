#include "server.h"

HttpRestServer::HttpRestServer(Pistache::Address addr)
    : http_endpoint_(std::make_shared<Pistache::Http::Endpoint>(addr)),
      rate_limiter_(Config::RATE_LIMIT_WINDOW_SECONDS, Config::RATE_LIMIT_MAX_REQUESTS),
      jwt_middleware_(auth_service_),
      auth_controller_(auth_service_),
      task_controller_() // TaskController depends on UserId injected by JWT middleware
{
    LOG_INFO("HTTP Rest Server created on address: " + addr.host() + ":" + std::to_string(addr.port()));
}

HttpRestServer::~HttpRestServer() {
    shutdown();
}

void HttpRestServer::init(size_t thr) {
    auto opts = Pistache::Http::Endpoint::options()
        .threads(thr)
        .flags(Pistache::Tcp::Options::ReuseAddr);
    http_endpoint_->init(opts);

    setup_routes(); // Configure API routes
}

void HttpRestServer::start() {
    LOG_INFO("HTTP Rest Server starting...");
    http_endpoint_->set )) // Configure API routes
    http_endpoint_->set ]).serve();
}

void HttpRestServer::shutdown() {
    if (http_endpoint_) {
        LOG_INFO("HTTP Rest Server shutting down...");
        http_endpoint_->shutdown();
    }
}

void HttpRestServer::setup_routes() {
    using namespace Pistache::Rest;
    Routes::Post(router_, "/auth/register", auth_controller_.register_user());
    Routes::Post(router_, "/auth/login", auth_controller_.login_user());

    // Middleware chain for protected routes: ErrorHandler -> RateLimiter -> JwtMiddleware -> Controller
    // The `middleware_handler` function allows chaining:
    // It takes a `next` function (the actual route handler)
    // and wraps it in our middleware logic.

    // Protected route for getting all tasks (requires authentication)
    Routes::Get(router_, "/tasks",
        Routes::chain(
            Routes::bind(&ErrorHandler::handle, &error_handler_),
            Routes::bind(&RateLimiter::limit, &rate_limiter_),
            Routes::bind(&JwtMiddleware::authenticate, &jwt_middleware_),
            task_controller_.get_all_tasks() // The actual handler
        )
    );

    // Protected route for creating a task
    Routes::Post(router_, "/tasks",
        Routes::chain(
            Routes::bind(&ErrorHandler::handle, &error_handler_),
            Routes::bind(&RateLimiter::limit, &rate_limiter_),
            Routes::bind(&JwtMiddleware::authenticate, &jwt_middleware_),
            task_controller_.create_task()
        )
    );

    // Protected route for getting a task by ID
    Routes::Get(router_, "/tasks/:id",
        Routes::chain(
            Routes::bind(&ErrorHandler::handle, &error_handler_),
            Routes::bind(&RateLimiter::limit, &rate_limiter_),
            Routes::bind(&JwtMiddleware::authenticate, &jwt_middleware_),
            task_controller_.get_task_by_id()
        )
    );

    // Protected route for updating a task by ID
    Routes::Put(router_, "/tasks/:id",
        Routes::chain(
            Routes::bind(&ErrorHandler::handle, &error_handler_),
            Routes::bind(&RateLimiter::limit, &rate_limiter_),
            Routes::bind(&JwtMiddleware::authenticate, &jwt_middleware_),
            task_controller_.update_task()
        )
    );

    // Protected route for deleting a task by ID (requires admin role)
    Routes::Delete(router_, "/tasks/:id",
        Routes::chain(
            Routes::bind(&ErrorHandler::handle, &error_handler_),
            Routes::bind(&RateLimiter::limit, &rate_limiter_),
            Routes::bind(&JwtMiddleware::authenticate, &jwt_middleware_),
            [&](const Request& req, ResponseWriter res) { // Lambda to wrap the role check
                // Check if the authenticated user has ADMIN role
                JwtMiddleware::require_role(UserRole::ADMIN, req);
                task_controller_.delete_task()(req, std::move(res));
            }
        )
    );

    // Default route for unmatched paths (handled by ErrorHandler's `next` chain if no match)
    router_.addNotFoundHandler(Routes::bind(&ErrorHandler::handle, &error_handler_));

    // Fallback for method not allowed (Pistache default for this is 405)
    // You could customize this if needed.
}
```