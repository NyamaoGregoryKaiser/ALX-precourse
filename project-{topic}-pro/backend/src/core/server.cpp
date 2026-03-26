#include "server.h"
#include <iostream>

CMS_Server::CMS_Server(int port, int threads) {
    Pistache::Address addr(Pistache::IP::ANY, Pistache::Port(port));
    http_endpoint = std::make_shared<Pistache::Http::Endpoint>(addr);

    auto opts = Pistache::Http::Endpoint::options()
        .threads(threads)
        .flags(Pistache::Http::Endpoint::options().flags() | Pistache::Tcp::Options::ReuseAddr);
    http_endpoint->init(opts);

    // Default auth middleware does nothing
    auth_middleware_func = [](const Pistache::Rest::Request&, Pistache::Http::ResponseWriter&, std::function<void(void)> next) { next(); };
}

void CMS_Server::start() {
    spdlog::info("CMS Server starting on port {}", http_endpoint->addr().port());
    http_endpoint->set	handler(router.handler());
    http_endpoint->serveThreaded(); // For a production server, consider serve() blocking call with proper signal handling.
    spdlog::info("CMS Server started.");
}

void CMS_Server::shutdown() {
    spdlog::info("CMS Server shutting down...");
    http_endpoint->shutdown();
    spdlog::info("CMS Server shut down.");
}

void CMS_Server::add_route(Pistache::Http::Method method, const std::string& path, Pistache::Rest::Route::Handler handler) {
    // Wrap the handler with middleware chain
    router.addRoute(method, path, Pistache::Rest::Route::Handler([this, handler](const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response) {
        // Create the chain of middleware -> auth_middleware -> actual_handler
        std::function<void(void)> final_handler = [&]() {
            try {
                handler(request, std::move(response));
            } catch (const Pistache::Http::HttpError& e) {
                // Pistache internal errors, let the ErrorHandlingMiddleware catch it later
                throw;
            } catch (const std::exception& e) {
                // Catch any uncaught exceptions from the handler
                spdlog::error("Unhandled exception in route {}: {}", request.resource(), e.what());
                response.send(Pistache::Http::Code::Internal_Server_Error, "Internal Server Error");
            }
        };

        // If this route requires authentication, apply it before the final handler
        // A more sophisticated system would have a flag per route or path prefix
        // For simplicity, here we always run auth_middleware_func before the final_handler for routes
        // For public routes, auth_middleware_func would do nothing (as set in constructor/main if not overridden)
        auto auth_chain = [&]() {
            auth_middleware_func(request, response, final_handler);
        };

        // Apply global middleware, then auth, then handler
        apply_middleware(request, response, auth_chain);
    }));
    spdlog::debug("Route added: {} {}", Pistache::Http::methodString(method), path);
}

void CMS_Server::add_middleware(MiddlewareFunc middleware) {
    global_middleware.push_back(middleware);
    spdlog::debug("Global middleware added.");
}

void CMS_Server::add_auth_middleware(MiddlewareFunc middleware) {
    auth_middleware_func = middleware;
    spdlog::debug("Authentication middleware set.");
}

void CMS_Server::apply_middleware(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next_in_chain) {
    if (global_middleware.empty()) {
        next_in_chain();
        return;
    }

    // This creates a recursive call chain for middleware
    std::function<void(size_t)> call_middleware =
        [&](size_t index) {
        if (index < global_middleware.size()) {
            global_middleware[index](req, resp, [&]() {
                call_middleware(index + 1);
            });
        } else {
            // All global middleware processed, call the next function in the chain (e.g., auth middleware or actual handler)
            next_in_chain();
        }
    };

    call_middleware(0);
}