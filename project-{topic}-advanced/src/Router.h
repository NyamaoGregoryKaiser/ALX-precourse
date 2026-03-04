```cpp
#ifndef VISGENIUS_ROUTER_H
#define VISGENIUS_ROUTER_H

#include <string>
#include <map>
#include <functional>
#include <vector>
#include <regex>
#include <memory>

#include "HttpUtils.h"
#include "Controller.h"
#include "AuthManager.h"
#include "Logger.h"

namespace VisGenius {

// Define a request handler type
// The handler receives HttpRequest and AuthToken, returns HttpResponse
using RequestHandler = std::function<HttpResponse(const HttpRequest&, const AuthToken&)>;
using PublicHandler = std::function<HttpResponse(const HttpRequest&)>;

struct Route {
    std::string method;
    std::string path_pattern; // e.g., "/data_sources/{id}"
    std::regex path_regex;
    std::vector<std::string> param_names; // e.g., {"id"}
    RequestHandler handler;
    PublicHandler public_handler; // For routes that don't require authentication
    bool requires_auth;
};

class Router {
public:
    Router(std::shared_ptr<AuthManager> auth_manager);

    void addRoute(const std::string& method, const std::string& path_pattern, RequestHandler handler);
    void addPublicRoute(const std::string& method, const std::string& path_pattern, PublicHandler handler);

    HttpResponse handleRequest(const HttpRequest& request);

private:
    std::vector<Route> m_routes;
    std::shared_ptr<AuthManager> m_authManager;

    // Helper to extract path parameters
    std::map<std::string, std::string> extractPathParams(const std::string& path, const std::regex& regex, const std::vector<std::string>& param_names);
};

} // namespace VisGenius

#endif // VISGENIUS_ROUTER_H
```