#pragma once
#include <pistache/endpoint.h>
#include <pistache/router.h>
#include <vector>
#include <functional>
#include "spdlog/spdlog.h"

// Define a type for middleware functions
using MiddlewareFunc = std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter&, std::function<void(void)>)>;

class CMS_Server {
public:
    CMS_Server(int port, int threads);
    void start();
    void shutdown();

    void add_route(Pistache::Http::Method method, const std::string& path, Pistache::Rest::Route::Handler handler);
    void add_middleware(MiddlewareFunc middleware);
    void add_auth_middleware(MiddlewareFunc middleware); // Special middleware that runs after global ones

private:
    std::shared_ptr<Pistache::Http::Endpoint> http_endpoint;
    Pistache::Rest::Router router;
    std::vector<MiddlewareFunc> global_middleware;
    MiddlewareFunc auth_middleware_func; // Only one auth middleware for simplicity, or a vector

    void apply_middleware(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter& resp, std::function<void(void)> next);
};