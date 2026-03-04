#pragma once

#include "HttpServer.h"
#include "middlewares/Middleware.h"
#include <functional>
#include <map>
#include <memory>
#include <string>
#include <vector>
#include <regex>

// Define a request handler type
using RequestHandler = std::function<HttpResponse(const HttpRequest&)>;

struct Route {
    std::string method;
    std::string path;
    std::regex path_regex; // For path parameter matching
    std::vector<std::string> param_names; // Names of path parameters
    RequestHandler handler;
    std::vector<std::shared_ptr<Middleware>> middlewares; // Route-specific middlewares
};

class Router {
public:
    Router();

    void get(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares = {});
    void post(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares = {});
    void put(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares = {});
    void del(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares = {});
    // Add other HTTP methods as needed (PATCH, OPTIONS, HEAD)

    // Apply global middlewares to all routes
    void use(std::shared_ptr<Middleware> middleware);

    // Group routes with common prefix and/or middlewares
    void group(const std::string& prefix, std::shared_ptr<Middleware> group_middleware, std::function<void(Router&)> group_config);
    void group(const std::string& prefix, std::function<void(Router&)> group_config);


    HttpResponse handleRequest(HttpRequest& req);

private:
    std::vector<Route> routes_;
    std::vector<std::shared_ptr<Middleware>> global_middlewares_;

    void addRoute(const std::string& method, const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares);
    std::pair<std::regex, std::vector<std::string>> parsePathToRegex(const std::string& path);
};