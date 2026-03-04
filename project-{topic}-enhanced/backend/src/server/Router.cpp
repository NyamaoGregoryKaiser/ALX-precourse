#include "Router.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp" // For error responses

#include <algorithm>

Router::Router() {}

void Router::get(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares) {
    addRoute("GET", path, handler, route_middlewares);
}

void Router::post(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares) {
    addRoute("POST", path, handler, route_middlewares);
}

void Router::put(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares) {
    addRoute("PUT", path, handler, route_middlewares);
}

void Router::del(const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares) {
    addRoute("DELETE", path, handler, route_middlewares);
}

void Router::use(std::shared_ptr<Middleware> middleware) {
    global_middlewares_.push_back(middleware);
}

void Router::group(const std::string& prefix, std::shared_ptr<Middleware> group_middleware, std::function<void(Router&)> group_config) {
    Router temp_router;
    group_config(temp_router);
    for (auto& route : temp_router.routes_) {
        route.path = prefix + route.path;
        route.middlewares.insert(route.middlewares.begin(), group_middleware); // Prepend group middleware
        routes_.push_back(route);
    }
}

void Router::group(const std::string& prefix, std::function<void(Router&)> group_config) {
    Router temp_router;
    group_config(temp_router);
    for (auto& route : temp_router.routes_) {
        route.path = prefix + route.path;
        routes_.push_back(route);
    }
}


HttpResponse Router::handleRequest(HttpRequest& req) {
    HttpResponse res;
    std::string method = req.raw_req.method_string().to_string();
    std::string target_path = req.raw_req.target().to_string();
    
    // Remove query string from target_path for matching
    size_t query_pos = target_path.find('?');
    if (query_pos != std::string::npos) {
        target_path = target_path.substr(0, query_pos);
    }

    // Apply global middlewares first
    for (const auto& middleware : global_middlewares_) {
        try {
            HttpResponse middleware_res = middleware->handle(req);
            if (middleware_res.status != http::status::continue_status) {
                return middleware_res; // Middleware short-circuited the request
            }
        } catch (const std::exception& e) {
            Logger::error("Global Middleware Error: " + std::string(e.what()));
            return HttpResponse(http::status::internal_server_error,
                                nlohmann::json({{"error", "Internal Server Error"}}).dump());
        }
    }

    for (const auto& route : routes_) {
        if (route.method == method) {
            std::smatch matches;
            if (std::regex_match(target_path, matches, route.path_regex)) {
                // Populate path parameters
                for (size_t i = 0; i < route.param_names.size(); ++i) {
                    if (i + 1 < matches.size()) { // matches[0] is the full string
                        req.params[route.param_names[i]] = matches[i + 1].str();
                    }
                }

                // Apply route-specific middlewares
                for (const auto& middleware : route.middlewares) {
                    try {
                        HttpResponse middleware_res = middleware->handle(req);
                        if (middleware_res.status != http::status::continue_status) {
                            return middleware_res; // Middleware short-circuited the request
                        }
                    } catch (const std::exception& e) {
                        Logger::error("Route Middleware Error: " + std::string(e.what()));
                        return HttpResponse(http::status::internal_server_error,
                                            nlohmann::json({{"error", "Internal Server Error"}}).dump());
                    }
                }

                // Execute the handler
                return route.handler(req);
            }
        }
    }

    // If no route found
    Logger::warn("404 Not Found: " + method + " " + target_path);
    return HttpResponse(http::status::not_found, nlohmann::json({{"error", "Not Found"}}).dump());
}

void Router::addRoute(const std::string& method, const std::string& path, RequestHandler handler, const std::vector<std::shared_ptr<Middleware>>& route_middlewares) {
    auto [path_regex, param_names] = parsePathToRegex(path);
    routes_.push_back({method, path, path_regex, param_names, handler, route_middlewares});
    Logger::debug("Added route: " + method + " " + path);
}

std::pair<std::regex, std::vector<std::string>> Router::parsePathToRegex(const std::string& path) {
    std::string regex_str = "^";
    std::vector<std::string> param_names;
    std::regex param_regex(":([a-zA-Z0-9_]+)"); // Matches :paramName

    std::sregex_iterator it(path.begin(), path.end(), param_regex);
    std::sregex_iterator end;

    size_t last_pos = 0;
    for (; it != end; ++it) {
        regex_str += path.substr(last_pos, it->position() - last_pos);
        regex_str += "([^/]+)"; // Capture group for the parameter value
        param_names.push_back((*it)[1].str()); // Capture group for the parameter name
        last_pos = it->position() + it->length();
    }
    regex_str += path.substr(last_pos);
    regex_str += "$";
    return {std::regex(regex_str), param_names};
}