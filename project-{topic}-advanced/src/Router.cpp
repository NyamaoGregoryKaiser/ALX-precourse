```cpp
#include "Router.h"
#include "ErrorHandling.h"
#include <algorithm> // For std::transform

namespace VisGenius {

Router::Router(std::shared_ptr<AuthManager> auth_manager) : m_authManager(auth_manager) {
    LOG_INFO("Router initialized.");
}

void Router::addRoute(const std::string& method, const std::string& path_pattern, RequestHandler handler) {
    Route route;
    route.method = method;
    route.path_pattern = path_pattern;
    route.handler = handler;
    route.requires_auth = true;

    // Convert path_pattern to regex and extract param names
    std::string regex_str = path_pattern;
    std::regex param_regex("\\{([a-zA-Z0-9_]+)\\}");
    std::sregex_iterator it(path_pattern.begin(), path_pattern.end(), param_regex);
    std::sregex_iterator end;

    size_t last_pos = 0;
    std::string final_regex_str = "";

    for (; it != end; ++it) {
        final_regex_str += path_pattern.substr(last_pos, it->position() - last_pos);
        final_regex_str += "([^/]+)"; // Capture anything not a slash
        route.param_names.push_back(it->str(1)); // Extract parameter name (e.g., "id")
        last_pos = it->position() + it->length();
    }
    final_regex_str += path_pattern.substr(last_pos);

    // Escape special regex characters in the final regex string (except those from param replacement)
    // This is a simplified approach, a full URL path to regex converter would be more complex
    std::string escaped_final_regex_str;
    for (char c : final_regex_str) {
        if (c == '.' || c == '+' || c == '*' || c == '?' || c == '^' || c == '$' || c == '(' || c == ')' || c == '[' || c == ']' || c == '{' || c == '}' || c == '|') {
            escaped_final_regex_str += '\\';
        }
        escaped_final_regex_str += c;
    }
    // Now replace "([^/]+)" which we manually added for parameters
    escaped_final_regex_str = std::regex_replace(escaped_final_regex_str, std::regex("\\\\\\(\\[\\^/\\]\\+\\\\\)"), "([^/]+)");
    
    route.path_regex = std::regex(escaped_final_regex_str + "$"); // Anchor to end of string

    m_routes.push_back(route);
    LOG_INFO("Added authenticated route: {} {}", method, path_pattern);
}

void Router::addPublicRoute(const std::string& method, const std::string& path_pattern, PublicHandler handler) {
    Route route;
    route.method = method;
    route.path_pattern = path_pattern;
    route.public_handler = handler;
    route.requires_auth = false;

    // Convert path_pattern to regex (similar logic to addRoute, but simplified as public routes might not have params)
    std::string regex_str = path_pattern;
    // For public routes, let's keep it simple, assume no path parameters for now.
    // If needed, the regex logic from addRoute can be adapted.
    
    // Escape special regex characters
    std::string escaped_regex_str;
    for (char c : regex_str) {
        if (c == '.' || c == '+' || c == '*' || c == '?' || c == '^' || c == '$' || c == '(' || c == ')' || c == '[' || c == ']' || c == '{' || c == '}' || c == '|') {
            escaped_regex_str += '\\';
        }
        escaped_regex_str += c;
    }
    route.path_regex = std::regex(escaped_regex_str + "$");

    m_routes.push_back(route);
    LOG_INFO("Added public route: {} {}", method, path_pattern);
}


std::map<std::string, std::string> Router::extractPathParams(const std::string& path, const std::regex& regex, const std::vector<std::string>& param_names) {
    std::map<std::string, std::string> params;
    std::smatch match;
    if (std::regex_match(path, match, regex)) {
        for (size_t i = 0; i < param_names.size(); ++i) {
            if (i + 1 < match.size()) { // match[0] is the whole string, match[1] is first capture
                params[param_names[i]] = match[i + 1].str();
            }
        }
    }
    return params;
}

HttpResponse Router::handleRequest(const HttpRequest& request) {
    LOG_DEBUG("Routing request: {} {}", request.method, request.path);

    // Rate limiting check (conceptual - this would be a middleware in a real server)
    // For simplicity, we'll put it in main server loop or before router in real project.

    // Authentication
    std::unique_ptr<AuthToken> auth_token = nullptr;
    auto auth_header_it = request.headers.find("authorization");
    if (auth_header_it != request.headers.end()) {
        std::string token_str = auth_header_it->second;
        // Basic "Bearer <token>" extraction
        if (token_str.rfind("Bearer ", 0) == 0) { // C++20 starts_with
            token_str = token_str.substr(7);
        }
        auth_token = m_authManager->validateToken(token_str);
    }
    
    for (const auto& route : m_routes) {
        if (request.method == route.method) {
            std::smatch match;
            if (std::regex_match(request.path, match, route.path_regex)) {
                HttpRequest current_request = request; // Copy to add path_params
                current_request.path_params = extractPathParams(request.path, route.path_regex, route.param_names);

                if (route.requires_auth) {
                    if (!auth_token) {
                        LOG_WARN("Authentication failed for route: {} {}", request.method, request.path);
                        HttpResponse response;
                        response.status_code = 401;
                        response.status_message = get_status_message(401);
                        response.set_content_type("application/json");
                        response.set_body("{\"code\":\"UNAUTHORIZED\",\"message\":\"Authentication required. Missing or invalid token.\"}");
                        return response;
                    }
                    return route.handler(current_request, *auth_token);
                } else {
                    // Public route, no auth needed
                    return route.public_handler(current_request);
                }
            }
        }
    }

    LOG_WARN("No route found for: {} {}", request.method, request.path);
    HttpResponse response;
    response.status_code = 404;
    response.status_message = "Not Found";
    response.set_content_type("application/json");
    response.set_body("{\"code\":\"NOT_FOUND\",\"message\":\"The requested resource was not found.\"}");
    return response;
}

} // namespace VisGenius
```