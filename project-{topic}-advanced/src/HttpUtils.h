```cpp
#ifndef VISGENIUS_HTTP_UTILS_H
#define VISGENIUS_HTTP_UTILS_H

#include <string>
#include <map>
#include <vector>

namespace VisGenius {

// Basic HTTP Request structure
struct HttpRequest {
    std::string method; // GET, POST, PUT, DELETE
    std::string path;
    std::string version; // HTTP/1.1
    std::map<std::string, std::string> headers;
    std::string body;
    std::map<std::string, std::string> path_params; // e.g., /resource/{id} -> {id: "value"}
    std::map<std::string, std::string> query_params; // e.g., /resource?key=value
};

// Basic HTTP Response structure
struct HttpResponse {
    int status_code = 200;
    std::string status_message = "OK";
    std::map<std::string, std::string> headers;
    std::string body;

    // Helper to set common headers
    HttpResponse& set_header(const std::string& key, const std::string& value) {
        headers[key] = value;
        return *this;
    }

    HttpResponse& set_content_type(const std::string& type) {
        return set_header("Content-Type", type);
    }

    HttpResponse& set_body(const std::string& data) {
        body = data;
        set_header("Content-Length", std::to_string(body.length()));
        return *this;
    }

    // Convert to HTTP string for sending over socket
    std::string to_string() const;
};

// Utility functions for parsing HTTP requests
HttpRequest parse_http_request(const std::string& raw_request);

// Utility for URL decoding (simple version)
std::string url_decode(const std::string& encoded);

// Utility to parse query parameters from a URL string
std::map<std::string, std::string> parse_query_params(const std::string& query_string);

// Helper to get status message for a code
std::string get_status_message(int status_code);

} // namespace VisGenius

#endif // VISGENIUS_HTTP_UTILS_H
```